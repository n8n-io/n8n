#!/usr/bin/env python3
"""
video_editor.py - Professional video editing with FFmpeg

Features:
- Cut, trim, concatenate clips
- Transitions (fade, dissolve, wipe)
- Audio mixing and normalization
- Color grading
- Subtitle handling
- Platform-specific exports

Usage:
    python video_editor.py cut input.mp4 --start 10 --end 60 -o output.mp4
    python video_editor.py concat clip1.mp4 clip2.mp4 clip3.mp4 -o final.mp4
    python video_editor.py transition fade clip1.mp4 clip2.mp4 -o output.mp4
    python video_editor.py export youtube input.mp4 -o youtube.mp4
"""

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple


@dataclass
class VideoInfo:
    """Video metadata from ffprobe"""
    duration: float
    width: int
    height: int
    fps: float
    codec: str
    bitrate: int
    color_space: str
    color_primaries: str
    color_transfer: str
    pix_fmt: str


class VideoEditor:
    """Professional video editor using FFmpeg"""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose

    def run_ffmpeg(self, args: List[str], check: bool = True) -> subprocess.CompletedProcess:
        """Run ffmpeg command with error handling"""
        cmd = ['ffmpeg', '-y'] + args
        if self.verbose:
            print(f"Running: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False
        )

        if check and result.returncode != 0:
            print(f"FFmpeg error: {result.stderr}", file=sys.stderr)
            sys.exit(1)

        return result

    def run_ffprobe(self, input_file: str) -> dict:
        """Get video metadata using ffprobe"""
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            input_file
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)

    def get_video_info(self, input_file: str) -> VideoInfo:
        """Extract video metadata"""
        probe = self.run_ffprobe(input_file)

        video_stream = next(
            (s for s in probe['streams'] if s['codec_type'] == 'video'),
            None
        )

        if not video_stream:
            raise ValueError(f"No video stream found in {input_file}")

        return VideoInfo(
            duration=float(probe['format']['duration']),
            width=video_stream['width'],
            height=video_stream['height'],
            fps=eval(video_stream['r_frame_rate']),
            codec=video_stream['codec_name'],
            bitrate=int(probe['format'].get('bit_rate', 0)),
            color_space=video_stream.get('color_space', 'unknown'),
            color_primaries=video_stream.get('color_primaries', 'unknown'),
            color_transfer=video_stream.get('color_transfer', 'unknown'),
            pix_fmt=video_stream.get('pix_fmt', 'yuv420p')
        )

    def find_keyframes(self, input_file: str) -> List[float]:
        """Find all keyframe timestamps"""
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-select_streams', 'v',
            '-show_frames',
            '-show_entries', 'frame=pkt_pts_time,key_frame',
            '-of', 'csv',
            input_file
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, check=True)

        keyframes = []
        for line in result.stdout.strip().split('\n'):
            if line.endswith(',1'):
                timestamp = float(line.split(',')[1])
                keyframes.append(timestamp)

        return keyframes

    def find_nearest_keyframe(self, input_file: str, timestamp: float) -> float:
        """Find nearest keyframe to given timestamp"""
        keyframes = self.find_keyframes(input_file)

        if not keyframes:
            return timestamp

        return min(keyframes, key=lambda k: abs(k - timestamp))

    def cut(
        self,
        input_file: str,
        output_file: str,
        start: float,
        end: Optional[float] = None,
        precise: bool = True,
        reencode: bool = False
    ):
        """
        Cut/trim video clip

        Args:
            input_file: Input video path
            output_file: Output video path
            start: Start time in seconds
            end: End time in seconds (None = to end of file)
            precise: Use frame-accurate cutting (slower)
            reencode: Force re-encoding (highest quality)
        """
        info = self.get_video_info(input_file)

        if end and end > info.duration:
            end = info.duration

        duration = (end - start) if end else None

        if reencode or precise:
            # Two-pass cutting: fast seek + precise cut
            args = [
                '-ss', str(max(0, start - 2)),  # Seek 2s before for safety
                '-i', input_file,
                '-ss', '2',  # Precise offset after input
            ]

            if duration:
                args += ['-t', str(duration)]

            args += [
                '-c:v', 'libx264',
                '-crf', '18',
                '-preset', 'medium',
                '-c:a', 'aac',
                '-b:a', '192k',
                output_file
            ]
        else:
            # Fast keyframe-aligned cutting
            start_kf = self.find_nearest_keyframe(input_file, start)

            args = ['-i', input_file, '-ss', str(start_kf)]

            if end:
                end_kf = self.find_nearest_keyframe(input_file, end)
                args += ['-to', str(end_kf)]

            args += ['-c', 'copy', output_file]

        self.run_ffmpeg(args)
        print(f"Cut complete: {output_file}")

    def concat(
        self,
        input_files: List[str],
        output_file: str,
        normalize_color: bool = True,
        transitions: Optional[str] = None
    ):
        """
        Concatenate multiple video clips

        Args:
            input_files: List of input video paths
            output_file: Output video path
            normalize_color: Normalize color spaces before concat
            transitions: Transition type ('fade', 'dissolve', 'wipe')
        """
        if len(input_files) < 2:
            raise ValueError("Need at least 2 input files to concatenate")

        if normalize_color:
            # Normalize all clips to BT.709
            normalized_files = []

            for i, input_file in enumerate(input_files):
                info = self.get_video_info(input_file)
                normalized = f"temp_normalized_{i}.mp4"

                if info.color_space == 'bt709':
                    # Already normalized
                    normalized_files.append(input_file)
                else:
                    # Convert to BT.709
                    args = [
                        '-i', input_file,
                        '-vf', 'scale=in_range=full:out_range=limited,colorspace=bt709:iall=bt601:fast=1',
                        '-color_primaries', 'bt709',
                        '-color_trc', 'bt709',
                        '-colorspace', 'bt709',
                        '-c:v', 'libx264',
                        '-crf', '18',
                        '-preset', 'medium',
                        '-c:a', 'copy',
                        normalized
                    ]

                    self.run_ffmpeg(args)
                    normalized_files.append(normalized)

            input_files = normalized_files

        if transitions:
            # Concatenate with transitions
            self._concat_with_transitions(input_files, output_file, transitions)
        else:
            # Simple concatenation using concat demuxer
            concat_list = Path('concat_list.txt')

            with concat_list.open('w') as f:
                for input_file in input_files:
                    f.write(f"file '{Path(input_file).absolute()}'\n")

            args = [
                '-f', 'concat',
                '-safe', '0',
                '-i', str(concat_list),
                '-c', 'copy',
                output_file
            ]

            self.run_ffmpeg(args)
            concat_list.unlink()

        # Cleanup normalized files
        if normalize_color:
            for f in input_files:
                if f.startswith('temp_normalized_'):
                    Path(f).unlink()

        print(f"Concatenation complete: {output_file}")

    def _concat_with_transitions(
        self,
        input_files: List[str],
        output_file: str,
        transition: str,
        duration: float = 1.0
    ):
        """Concatenate with crossfade transitions"""
        # Build filter_complex for xfade transitions
        filter_parts = []

        for i in range(len(input_files) - 1):
            if i == 0:
                filter_parts.append(f"[0:v][1:v]xfade=transition={transition}:duration={duration}:offset=5[v01];")
            else:
                filter_parts.append(f"[v0{i}][{i+1}:v]xfade=transition={transition}:duration={duration}:offset=5[v0{i+1}];")

        filter_complex = ''.join(filter_parts)

        args = []
        for input_file in input_files:
            args += ['-i', input_file]

        args += [
            '-filter_complex', filter_complex,
            '-map', f"[v0{len(input_files)-1}]",
            '-c:v', 'libx264',
            '-crf', '18',
            '-preset', 'medium',
            output_file
        ]

        self.run_ffmpeg(args)

    def add_audio(
        self,
        video_file: str,
        audio_file: str,
        output_file: str,
        mix: bool = False,
        volume: float = 1.0,
        sync_offset: float = 0.0
    ):
        """
        Add or replace audio track

        Args:
            video_file: Input video path
            audio_file: Input audio path
            output_file: Output video path
            mix: Mix with original audio (vs replace)
            volume: Audio volume multiplier
            sync_offset: Audio delay in seconds (positive = delay, negative = advance)
        """
        if mix:
            # Mix original and new audio
            args = [
                '-i', video_file,
                '-itsoffset', str(sync_offset),
                '-i', audio_file,
                '-filter_complex', f'[0:a][1:a]amix=inputs=2:duration=first[a]',
                '-map', '0:v',
                '-map', '[a]',
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-b:a', '192k',
                output_file
            ]
        else:
            # Replace audio
            args = [
                '-i', video_file,
                '-itsoffset', str(sync_offset),
                '-i', audio_file,
                '-map', '0:v',
                '-map', '1:a',
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-b:a', '192k',
                '-shortest',
                output_file
            ]

        self.run_ffmpeg(args)
        print(f"Audio added: {output_file}")

    def add_subtitles(
        self,
        input_file: str,
        subtitle_file: str,
        output_file: str,
        burn: bool = True
    ):
        """
        Add subtitles to video

        Args:
            input_file: Input video path
            subtitle_file: Subtitle file (.srt, .ass)
            output_file: Output video path
            burn: Burn subtitles into video (vs soft subs)
        """
        if burn:
            # Burn subtitles into video
            args = [
                '-i', input_file,
                '-vf', f"subtitles={subtitle_file}",
                '-c:v', 'libx264',
                '-crf', '18',
                '-preset', 'medium',
                '-c:a', 'copy',
                output_file
            ]
        else:
            # Add soft subtitles
            args = [
                '-i', input_file,
                '-i', subtitle_file,
                '-c:v', 'copy',
                '-c:a', 'copy',
                '-c:s', 'mov_text',
                '-metadata:s:s:0', 'language=eng',
                output_file
            ]

        self.run_ffmpeg(args)
        print(f"Subtitles added: {output_file}")

    def color_grade(
        self,
        input_file: str,
        output_file: str,
        brightness: float = 0.0,
        contrast: float = 1.0,
        saturation: float = 1.0,
        gamma: float = 1.0
    ):
        """
        Apply color grading

        Args:
            input_file: Input video path
            output_file: Output video path
            brightness: Brightness adjustment (-1.0 to 1.0)
            contrast: Contrast multiplier (0.0 to 2.0)
            saturation: Saturation multiplier (0.0 to 3.0)
            gamma: Gamma correction (0.1 to 10.0)
        """
        filters = []

        if brightness != 0.0 or contrast != 1.0:
            filters.append(f"eq=brightness={brightness}:contrast={contrast}")

        if saturation != 1.0:
            filters.append(f"eq=saturation={saturation}")

        if gamma != 1.0:
            filters.append(f"eq=gamma={gamma}")

        vf = ','.join(filters) if filters else 'null'

        args = [
            '-i', input_file,
            '-vf', vf,
            '-c:v', 'libx264',
            '-crf', '18',
            '-preset', 'medium',
            '-c:a', 'copy',
            output_file
        ]

        self.run_ffmpeg(args)
        print(f"Color grading complete: {output_file}")

    def export_for_platform(
        self,
        input_file: str,
        output_file: str,
        platform: str,
        quality: str = 'high'
    ):
        """
        Export optimized for specific platform

        Platforms: youtube, instagram_story, instagram_reel, instagram_feed,
                   twitter, tiktok, linkedin, web
        Quality: draft, medium, high
        """
        presets = {
            'youtube': {
                'resolution': '1920x1080',
                'fps': 30,
                'crf': {'draft': 28, 'medium': 23, 'high': 18},
                'preset': {'draft': 'ultrafast', 'medium': 'medium', 'high': 'slow'},
                'audio_bitrate': '192k'
            },
            'instagram_story': {
                'resolution': '1080x1920',
                'fps': 30,
                'crf': {'draft': 28, 'medium': 23, 'high': 20},
                'preset': {'draft': 'ultrafast', 'medium': 'medium', 'high': 'medium'},
                'audio_bitrate': '128k',
                'max_duration': 15
            },
            'instagram_reel': {
                'resolution': '1080x1920',
                'fps': 30,
                'crf': {'draft': 28, 'medium': 23, 'high': 20},
                'preset': {'draft': 'ultrafast', 'medium': 'medium', 'high': 'medium'},
                'audio_bitrate': '128k',
                'max_duration': 90
            },
            'instagram_feed': {
                'resolution': '1080x1080',
                'fps': 30,
                'crf': {'draft': 28, 'medium': 23, 'high': 20},
                'preset': {'draft': 'ultrafast', 'medium': 'medium', 'high': 'medium'},
                'audio_bitrate': '128k'
            },
            'twitter': {
                'resolution': '1280x720',
                'fps': 30,
                'crf': {'draft': 28, 'medium': 23, 'high': 20},
                'preset': {'draft': 'ultrafast', 'medium': 'medium', 'high': 'medium'},
                'audio_bitrate': '128k',
                'maxrate': '5000k',
                'bufsize': '10000k'
            },
            'tiktok': {
                'resolution': '1080x1920',
                'fps': 30,
                'crf': {'draft': 28, 'medium': 23, 'high': 20},
                'preset': {'draft': 'ultrafast', 'medium': 'medium', 'high': 'medium'},
                'audio_bitrate': '128k'
            },
            'web': {
                'resolution': '1920x1080',
                'fps': 30,
                'crf': {'draft': 28, 'medium': 23, 'high': 20},
                'preset': {'draft': 'ultrafast', 'medium': 'medium', 'high': 'medium'},
                'audio_bitrate': '128k',
                'profile': 'baseline',
                'level': '3.0'
            }
        }

        if platform not in presets:
            raise ValueError(f"Unknown platform: {platform}")

        config = presets[platform]

        args = [
            '-i', input_file,
            '-c:v', 'libx264',
            '-preset', config['preset'][quality],
            '-crf', str(config['crf'][quality]),
            '-s', config['resolution'],
            '-r', str(config['fps']),
            '-pix_fmt', 'yuv420p',
            '-color_primaries', 'bt709',
            '-color_trc', 'bt709',
            '-colorspace', 'bt709',
            '-movflags', '+faststart',
            '-c:a', 'aac',
            '-b:a', config['audio_bitrate'],
            '-ar', '48000'
        ]

        if 'maxrate' in config:
            args += ['-maxrate', config['maxrate'], '-bufsize', config['bufsize']]

        if 'profile' in config:
            args += ['-profile:v', config['profile']]

        if 'level' in config:
            args += ['-level', config['level']]

        if 'max_duration' in config:
            args += ['-t', str(config['max_duration'])]

        args.append(output_file)

        self.run_ffmpeg(args)
        print(f"Export complete for {platform}: {output_file}")


def main():
    parser = argparse.ArgumentParser(description='Professional video editor')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')

    subparsers = parser.add_subparsers(dest='command', required=True)

    # Cut command
    cut_parser = subparsers.add_parser('cut', help='Cut/trim video')
    cut_parser.add_argument('input', help='Input video file')
    cut_parser.add_argument('-s', '--start', type=float, required=True, help='Start time (seconds)')
    cut_parser.add_argument('-e', '--end', type=float, help='End time (seconds)')
    cut_parser.add_argument('-o', '--output', required=True, help='Output file')
    cut_parser.add_argument('--precise', action='store_true', help='Frame-accurate cutting')
    cut_parser.add_argument('--reencode', action='store_true', help='Force re-encoding')

    # Concat command
    concat_parser = subparsers.add_parser('concat', help='Concatenate videos')
    concat_parser.add_argument('inputs', nargs='+', help='Input video files')
    concat_parser.add_argument('-o', '--output', required=True, help='Output file')
    concat_parser.add_argument('--no-normalize', action='store_true', help='Skip color normalization')
    concat_parser.add_argument('-t', '--transition', choices=['fade', 'dissolve', 'wipe'], help='Transition type')

    # Audio command
    audio_parser = subparsers.add_parser('audio', help='Add/replace audio')
    audio_parser.add_argument('video', help='Input video file')
    audio_parser.add_argument('audio', help='Input audio file')
    audio_parser.add_argument('-o', '--output', required=True, help='Output file')
    audio_parser.add_argument('--mix', action='store_true', help='Mix with original audio')
    audio_parser.add_argument('--volume', type=float, default=1.0, help='Volume multiplier')
    audio_parser.add_argument('--offset', type=float, default=0.0, help='Sync offset (seconds)')

    # Subtitles command
    subs_parser = subparsers.add_parser('subtitles', help='Add subtitles')
    subs_parser.add_argument('video', help='Input video file')
    subs_parser.add_argument('subtitles', help='Subtitle file (.srt, .ass)')
    subs_parser.add_argument('-o', '--output', required=True, help='Output file')
    subs_parser.add_argument('--soft', action='store_true', help='Soft subtitles (not burned)')

    # Color grade command
    grade_parser = subparsers.add_parser('grade', help='Color grading')
    grade_parser.add_argument('input', help='Input video file')
    grade_parser.add_argument('-o', '--output', required=True, help='Output file')
    grade_parser.add_argument('--brightness', type=float, default=0.0, help='Brightness (-1 to 1)')
    grade_parser.add_argument('--contrast', type=float, default=1.0, help='Contrast (0 to 2)')
    grade_parser.add_argument('--saturation', type=float, default=1.0, help='Saturation (0 to 3)')
    grade_parser.add_argument('--gamma', type=float, default=1.0, help='Gamma (0.1 to 10)')

    # Export command
    export_parser = subparsers.add_parser('export', help='Export for platform')
    export_parser.add_argument('platform', choices=[
        'youtube', 'instagram_story', 'instagram_reel', 'instagram_feed',
        'twitter', 'tiktok', 'linkedin', 'web'
    ], help='Target platform')
    export_parser.add_argument('input', help='Input video file')
    export_parser.add_argument('-o', '--output', required=True, help='Output file')
    export_parser.add_argument('-q', '--quality', choices=['draft', 'medium', 'high'],
                                default='high', help='Export quality')

    args = parser.parse_args()

    editor = VideoEditor(verbose=args.verbose)

    try:
        if args.command == 'cut':
            editor.cut(
                args.input,
                args.output,
                args.start,
                args.end,
                precise=args.precise,
                reencode=args.reencode
            )

        elif args.command == 'concat':
            editor.concat(
                args.inputs,
                args.output,
                normalize_color=not args.no_normalize,
                transitions=args.transition
            )

        elif args.command == 'audio':
            editor.add_audio(
                args.video,
                args.audio,
                args.output,
                mix=args.mix,
                volume=args.volume,
                sync_offset=args.offset
            )

        elif args.command == 'subtitles':
            editor.add_subtitles(
                args.video,
                args.subtitles,
                args.output,
                burn=not args.soft
            )

        elif args.command == 'grade':
            editor.color_grade(
                args.input,
                args.output,
                brightness=args.brightness,
                contrast=args.contrast,
                saturation=args.saturation,
                gamma=args.gamma
            )

        elif args.command == 'export':
            editor.export_for_platform(
                args.input,
                args.output,
                args.platform,
                quality=args.quality
            )

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
