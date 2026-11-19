#!/usr/bin/env python3
"""
Time-Lapse Creator

Create time-lapse videos from:
- Image sequences (photos taken at intervals)
- Video footage (speed up existing video)
- Webcam/camera captures

Features:
- Deflicker for smooth exposure transitions
- Motion blur for smoother appearance
- Day-to-night transitions
- Ken Burns zoom/pan effects
- Music synchronization

Usage:
    python timelapse_creator.py from-images --input ./photos/ --fps 30 -o timelapse.mp4
    python timelapse_creator.py from-video --input long_video.mp4 --speed 60x -o timelapse.mp4
    python timelapse_creator.py hyperlapse --input walking.mp4 --stabilize -o hyperlapse.mp4
"""

import argparse
import subprocess
import sys
import os
import glob
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional, Tuple
import re


@dataclass
class TimeLapseConfig:
    """Configuration for time-lapse creation."""
    output_fps: int = 30
    output_resolution: str = "1920x1080"
    codec: str = "libx264"
    crf: int = 18
    preset: str = "slow"
    pixel_format: str = "yuv420p"


def run_ffmpeg(cmd: list, description: str = "") -> bool:
    """Execute FFmpeg command."""
    print(f"🎬 {description or 'Processing'}...")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"⚠️  Warning: {result.stderr[:500]}")
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def get_video_info(video_path: str) -> dict:
    """Get video metadata."""
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format", "-show_streams",
        video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    import json
    return json.loads(result.stdout)


def find_images(input_dir: str, pattern: str = "*") -> List[str]:
    """Find image files in directory."""
    extensions = ["jpg", "jpeg", "png", "tiff", "tif", "bmp"]
    images = []

    for ext in extensions:
        images.extend(glob.glob(os.path.join(input_dir, f"{pattern}.{ext}")))
        images.extend(glob.glob(os.path.join(input_dir, f"{pattern}.{ext.upper()}")))

    # Sort naturally (handle IMG_001, IMG_002, etc.)
    def natural_sort_key(s):
        return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', s)]

    images.sort(key=natural_sort_key)
    return images


def create_image_list(images: List[str], output_path: str, frame_duration: float = 1/30) -> str:
    """Create FFmpeg concat list file."""
    with open(output_path, 'w') as f:
        for img in images:
            # Escape special characters in path
            escaped_path = img.replace("'", "'\\''")
            f.write(f"file '{escaped_path}'\n")
            f.write(f"duration {frame_duration}\n")
        # Add last image again (FFmpeg concat quirk)
        if images:
            f.write(f"file '{images[-1]}'\n")
    return output_path


class ImageSequenceTimeLapse:
    """Create time-lapse from image sequence."""

    def __init__(self, config: TimeLapseConfig):
        self.config = config

    def create(
        self,
        input_dir: str,
        output_path: str,
        fps: int = 30,
        deflicker: bool = False,
        crossfade: float = 0,
        music: Optional[str] = None
    ) -> bool:
        """Create time-lapse from images."""

        images = find_images(input_dir)
        if not images:
            print(f"❌ No images found in {input_dir}")
            return False

        print(f"📸 Found {len(images)} images")

        # Method 1: Using glob pattern (if images are numbered sequentially)
        # Check if images follow a pattern like IMG_0001.jpg
        first_image = images[0]
        img_dir = os.path.dirname(first_image)
        img_name = os.path.basename(first_image)

        # Try to find numbering pattern
        match = re.search(r'(\d{3,})', img_name)

        if match:
            # Use FFmpeg's image sequence input
            prefix = img_name[:match.start()]
            suffix = img_name[match.end():]
            num_digits = len(match.group(1))
            pattern = f"{img_dir}/{prefix}%0{num_digits}d{suffix}"

            filter_complex = []

            # Scale to output resolution
            filter_complex.append(f"scale={self.config.output_resolution}:force_original_aspect_ratio=decrease")
            filter_complex.append(f"pad={self.config.output_resolution}:(ow-iw)/2:(oh-ih)/2")

            # Deflicker if requested
            if deflicker:
                filter_complex.append("deflicker=size=5:mode=am")

            cmd = [
                "ffmpeg", "-y",
                "-framerate", str(fps),
                "-i", pattern,
                "-vf", ",".join(filter_complex),
                "-c:v", self.config.codec,
                "-crf", str(self.config.crf),
                "-preset", self.config.preset,
                "-pix_fmt", self.config.pixel_format,
                "-movflags", "+faststart"
            ]

        else:
            # Use concat demuxer for non-sequential images
            list_file = "/tmp/timelapse_images.txt"
            create_image_list(images, list_file, frame_duration=1/fps)

            filter_complex = []
            filter_complex.append(f"scale={self.config.output_resolution}:force_original_aspect_ratio=decrease")
            filter_complex.append(f"pad={self.config.output_resolution}:(ow-iw)/2:(oh-ih)/2")

            if deflicker:
                filter_complex.append("deflicker=size=5:mode=am")

            cmd = [
                "ffmpeg", "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", list_file,
                "-vf", ",".join(filter_complex),
                "-c:v", self.config.codec,
                "-crf", str(self.config.crf),
                "-preset", self.config.preset,
                "-pix_fmt", self.config.pixel_format,
                "-movflags", "+faststart"
            ]

        # Add music if provided
        if music:
            cmd.extend(["-i", music])
            cmd.extend(["-c:a", "aac", "-b:a", "192k"])
            cmd.extend(["-shortest"])

        cmd.append(output_path)

        return run_ffmpeg(cmd, f"Creating time-lapse from {len(images)} images")

    def create_with_ken_burns(
        self,
        input_dir: str,
        output_path: str,
        fps: int = 30,
        duration_per_image: float = 3.0,
        zoom_factor: float = 1.2
    ) -> bool:
        """Create time-lapse with Ken Burns (pan/zoom) effect."""

        images = find_images(input_dir)
        if not images:
            print(f"❌ No images found in {input_dir}")
            return False

        print(f"📸 Found {len(images)} images (Ken Burns effect)")

        # For Ken Burns, we process each image with zoompan
        # Then concatenate
        temp_clips = []

        for i, img in enumerate(images):
            print(f"   Processing image {i+1}/{len(images)}...")
            temp_clip = f"/tmp/kenburns_{i:04d}.mp4"

            frames = int(duration_per_image * fps)

            # Alternate between zoom in and zoom out
            if i % 2 == 0:
                # Zoom in
                zoom_expr = f"min({zoom_factor},zoom+0.001)"
            else:
                # Zoom out
                zoom_expr = f"max(1,zoom-0.001)"

            cmd = [
                "ffmpeg", "-y",
                "-loop", "1",
                "-i", img,
                "-vf", f"scale=8000:-1,zoompan=z='{zoom_expr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={self.config.output_resolution}:fps={fps}",
                "-t", str(duration_per_image),
                "-c:v", self.config.codec,
                "-crf", str(self.config.crf),
                "-pix_fmt", self.config.pixel_format,
                temp_clip
            ]

            if not run_ffmpeg(cmd, f"Ken Burns effect on image {i+1}"):
                continue

            temp_clips.append(temp_clip)

        if not temp_clips:
            print("❌ No clips generated")
            return False

        # Concatenate all clips
        list_file = "/tmp/kenburns_list.txt"
        with open(list_file, 'w') as f:
            for clip in temp_clips:
                f.write(f"file '{clip}'\n")

        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", list_file,
            "-c:v", self.config.codec,
            "-crf", str(self.config.crf),
            "-movflags", "+faststart",
            output_path
        ]

        success = run_ffmpeg(cmd, "Concatenating Ken Burns clips")

        # Cleanup
        for clip in temp_clips:
            try:
                os.remove(clip)
            except:
                pass

        return success


class VideoSpeedUp:
    """Create time-lapse by speeding up video."""

    def __init__(self, config: TimeLapseConfig):
        self.config = config

    def create(
        self,
        input_path: str,
        output_path: str,
        speed_factor: float = 10.0,
        motion_blur: bool = False,
        audio: bool = False
    ) -> bool:
        """Speed up video to create time-lapse effect."""

        print(f"⏩ Speeding up video by {speed_factor}x...")

        # Calculate setpts value (1/speed for speedup)
        pts_factor = 1.0 / speed_factor

        filter_complex = [f"setpts={pts_factor}*PTS"]

        # Add motion blur using minterpolate (creates smoother result)
        if motion_blur:
            filter_complex.append("minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1")

        # Scale to output resolution
        filter_complex.append(f"scale={self.config.output_resolution}:force_original_aspect_ratio=decrease")
        filter_complex.append(f"pad={self.config.output_resolution}:(ow-iw)/2:(oh-ih)/2")

        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-vf", ",".join(filter_complex),
            "-c:v", self.config.codec,
            "-crf", str(self.config.crf),
            "-preset", self.config.preset,
            "-pix_fmt", self.config.pixel_format,
            "-movflags", "+faststart"
        ]

        if audio and speed_factor <= 2.0:
            # Audio can only be sped up by 2x with atempo
            cmd.extend(["-af", f"atempo={speed_factor}"])
            cmd.extend(["-c:a", "aac", "-b:a", "128k"])
        else:
            cmd.extend(["-an"])  # No audio

        cmd.append(output_path)

        return run_ffmpeg(cmd, f"Creating {speed_factor}x speed time-lapse")

    def create_hyperlapse(
        self,
        input_path: str,
        output_path: str,
        speed_factor: float = 8.0,
        stabilize: bool = True
    ) -> bool:
        """Create hyperlapse with optional stabilization."""

        if stabilize:
            print("📐 Analyzing video for stabilization...")

            # Two-pass stabilization
            # Pass 1: Analyze
            vectors_file = "/tmp/transforms.trf"
            cmd_analyze = [
                "ffmpeg", "-y",
                "-i", input_path,
                "-vf", f"vidstabdetect=stepsize=6:shakiness=8:accuracy=9:result={vectors_file}",
                "-f", "null", "-"
            ]

            if not run_ffmpeg(cmd_analyze, "Analyzing motion"):
                print("⚠️  Stabilization analysis failed, continuing without")
                stabilize = False

        pts_factor = 1.0 / speed_factor

        filter_complex = [f"setpts={pts_factor}*PTS"]

        if stabilize:
            filter_complex.append(f"vidstabtransform=input={vectors_file}:zoom=1:smoothing=30")
            filter_complex.append("unsharp=5:5:0.8:3:3:0.4")

        filter_complex.append(f"scale={self.config.output_resolution}:force_original_aspect_ratio=decrease")
        filter_complex.append(f"pad={self.config.output_resolution}:(ow-iw)/2:(oh-ih)/2")

        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-vf", ",".join(filter_complex),
            "-c:v", self.config.codec,
            "-crf", str(self.config.crf),
            "-preset", self.config.preset,
            "-pix_fmt", self.config.pixel_format,
            "-an",
            "-movflags", "+faststart",
            output_path
        ]

        return run_ffmpeg(cmd, f"Creating stabilized {speed_factor}x hyperlapse")


class DayNightTimeLapse:
    """Create day-to-night or night-to-day time-lapse with deflickering."""

    def __init__(self, config: TimeLapseConfig):
        self.config = config

    def create(
        self,
        input_dir: str,
        output_path: str,
        fps: int = 30,
        deflicker_strength: int = 5
    ) -> bool:
        """Create day-night time-lapse with deflickering."""

        images = find_images(input_dir)
        if not images:
            print(f"❌ No images found in {input_dir}")
            return False

        print(f"🌅 Creating day-night time-lapse from {len(images)} images")

        # Check for sequential numbering
        first_image = images[0]
        img_dir = os.path.dirname(first_image)
        img_name = os.path.basename(first_image)
        match = re.search(r'(\d{3,})', img_name)

        if match:
            prefix = img_name[:match.start()]
            suffix = img_name[match.end():]
            num_digits = len(match.group(1))
            pattern = f"{img_dir}/{prefix}%0{num_digits}d{suffix}"

            # Deflicker is crucial for day-night transitions
            # size determines how many frames to average for exposure smoothing
            filter_complex = [
                f"scale={self.config.output_resolution}:force_original_aspect_ratio=decrease",
                f"pad={self.config.output_resolution}:(ow-iw)/2:(oh-ih)/2",
                f"deflicker=size={deflicker_strength}:mode=am"
            ]

            cmd = [
                "ffmpeg", "-y",
                "-framerate", str(fps),
                "-i", pattern,
                "-vf", ",".join(filter_complex),
                "-c:v", self.config.codec,
                "-crf", str(self.config.crf),
                "-preset", self.config.preset,
                "-pix_fmt", self.config.pixel_format,
                "-movflags", "+faststart",
                output_path
            ]

            return run_ffmpeg(cmd, "Creating deflickered day-night time-lapse")

        else:
            print("❌ Images must be numbered sequentially for day-night processing")
            return False


def main():
    parser = argparse.ArgumentParser(
        description="Time-Lapse Creator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # From image sequence
    python timelapse_creator.py from-images --input ./photos/ --fps 30 -o timelapse.mp4

    # With deflicker (for varying exposure)
    python timelapse_creator.py from-images --input ./photos/ --fps 30 --deflicker -o timelapse.mp4

    # Ken Burns effect (pan/zoom)
    python timelapse_creator.py ken-burns --input ./photos/ --duration 3 -o slideshow.mp4

    # Speed up video
    python timelapse_creator.py from-video --input long_video.mp4 --speed 60 -o timelapse.mp4

    # Hyperlapse with stabilization
    python timelapse_creator.py hyperlapse --input walking.mp4 --speed 8 --stabilize -o hyperlapse.mp4

    # Day-night transition
    python timelapse_creator.py day-night --input ./photos/ --deflicker-strength 7 -o daynight.mp4
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # From images
    img_parser = subparsers.add_parser("from-images", help="Create from image sequence")
    img_parser.add_argument("--input", "-i", required=True, help="Input directory")
    img_parser.add_argument("--fps", type=int, default=30, help="Output frame rate")
    img_parser.add_argument("--deflicker", action="store_true", help="Apply deflicker filter")
    img_parser.add_argument("--music", help="Background music file")
    img_parser.add_argument("-o", "--output", default="timelapse.mp4", help="Output file")

    # Ken Burns
    kb_parser = subparsers.add_parser("ken-burns", help="Create with Ken Burns effect")
    kb_parser.add_argument("--input", "-i", required=True, help="Input directory")
    kb_parser.add_argument("--fps", type=int, default=30, help="Output frame rate")
    kb_parser.add_argument("--duration", type=float, default=3.0, help="Duration per image")
    kb_parser.add_argument("--zoom", type=float, default=1.2, help="Zoom factor")
    kb_parser.add_argument("-o", "--output", default="slideshow.mp4", help="Output file")

    # From video
    vid_parser = subparsers.add_parser("from-video", help="Speed up existing video")
    vid_parser.add_argument("--input", "-i", required=True, help="Input video")
    vid_parser.add_argument("--speed", type=float, default=10.0, help="Speed multiplier")
    vid_parser.add_argument("--motion-blur", action="store_true", help="Add motion blur")
    vid_parser.add_argument("--keep-audio", action="store_true", help="Keep audio (up to 2x)")
    vid_parser.add_argument("-o", "--output", default="timelapse.mp4", help="Output file")

    # Hyperlapse
    hyper_parser = subparsers.add_parser("hyperlapse", help="Create stabilized hyperlapse")
    hyper_parser.add_argument("--input", "-i", required=True, help="Input video")
    hyper_parser.add_argument("--speed", type=float, default=8.0, help="Speed multiplier")
    hyper_parser.add_argument("--stabilize", action="store_true", help="Apply stabilization")
    hyper_parser.add_argument("-o", "--output", default="hyperlapse.mp4", help="Output file")

    # Day-night
    dn_parser = subparsers.add_parser("day-night", help="Create day-night timelapse")
    dn_parser.add_argument("--input", "-i", required=True, help="Input directory")
    dn_parser.add_argument("--fps", type=int, default=30, help="Output frame rate")
    dn_parser.add_argument("--deflicker-strength", type=int, default=5, help="Deflicker window size")
    dn_parser.add_argument("-o", "--output", default="daynight.mp4", help="Output file")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    config = TimeLapseConfig()
    success = False

    if args.command == "from-images":
        creator = ImageSequenceTimeLapse(config)
        success = creator.create(
            args.input, args.output, args.fps,
            deflicker=args.deflicker, music=args.music
        )

    elif args.command == "ken-burns":
        creator = ImageSequenceTimeLapse(config)
        success = creator.create_with_ken_burns(
            args.input, args.output, args.fps, args.duration, args.zoom
        )

    elif args.command == "from-video":
        creator = VideoSpeedUp(config)
        success = creator.create(
            args.input, args.output, args.speed,
            motion_blur=args.motion_blur, audio=args.keep_audio
        )

    elif args.command == "hyperlapse":
        creator = VideoSpeedUp(config)
        success = creator.create_hyperlapse(
            args.input, args.output, args.speed, stabilize=args.stabilize
        )

    elif args.command == "day-night":
        creator = DayNightTimeLapse(config)
        success = creator.create(
            args.input, args.output, args.fps, args.deflicker_strength
        )

    if success:
        print(f"✅ Created: {args.output}")
    else:
        print("❌ Failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
