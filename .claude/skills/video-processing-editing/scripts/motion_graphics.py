#!/usr/bin/env python3
"""
Motion Graphics Generator for FFmpeg

Creates animated graphics, lower thirds, text animations, and overlays
using FFmpeg's drawtext, overlay, and complex filter capabilities.

Usage:
    python motion_graphics.py lower-third --text "John Smith" --subtitle "CEO" --output lower_third.mov
    python motion_graphics.py text-animate --text "Welcome" --style fade --output title.mov
    python motion_graphics.py progress-bar --duration 30 --output progress.mov
    python motion_graphics.py logo-overlay --video input.mp4 --logo logo.png --position bottom-right --output branded.mp4
"""

import argparse
import subprocess
import sys
import json
from pathlib import Path
from dataclasses import dataclass
from typing import Optional, Tuple
import math


@dataclass
class AnimationConfig:
    """Configuration for animation parameters."""
    duration: float = 5.0
    fps: int = 30
    width: int = 1920
    height: int = 1080
    background: str = "transparent"  # or hex color


def run_ffmpeg(cmd: list, description: str = "") -> bool:
    """Execute FFmpeg command with error handling."""
    print(f"🎬 {description or 'Running FFmpeg'}...")
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ FFmpeg error: {e.stderr}")
        return False


class LowerThirdGenerator:
    """Generate professional lower third graphics."""

    STYLES = {
        "modern": {
            "bg_color": "0x1a1a2e@0.85",
            "accent_color": "0x4ecdc4",
            "text_color": "white",
            "font": "Arial",
            "animation": "slide"
        },
        "minimal": {
            "bg_color": "0x000000@0.7",
            "accent_color": "0xffffff",
            "text_color": "white",
            "font": "Helvetica",
            "animation": "fade"
        },
        "corporate": {
            "bg_color": "0x2c3e50@0.9",
            "accent_color": "0x3498db",
            "text_color": "white",
            "font": "Arial",
            "animation": "slide"
        },
        "creative": {
            "bg_color": "0xff6b6b@0.85",
            "accent_color": "0xffd93d",
            "text_color": "white",
            "font": "Impact",
            "animation": "bounce"
        }
    }

    def __init__(self, config: AnimationConfig):
        self.config = config

    def generate(
        self,
        text: str,
        subtitle: str = "",
        style: str = "modern",
        output: str = "lower_third.mov",
        hold_duration: float = 3.0
    ) -> bool:
        """Generate an animated lower third graphic."""

        style_config = self.STYLES.get(style, self.STYLES["modern"])

        # Calculate dimensions
        bar_height = 100
        bar_y = self.config.height - bar_height - 50
        accent_width = 8

        # Animation timing
        fade_in = 0.5
        fade_out = 0.5
        total_duration = fade_in + hold_duration + fade_out

        # Build complex filter for animated lower third
        filter_complex = f"""
        color=c=black@0:s={self.config.width}x{self.config.height}:d={total_duration}:r={self.config.fps}[bg];

        [bg]drawbox=x=0:y={bar_y}:w={self.config.width}:h={bar_height}:
            color={style_config['bg_color']}:t=fill:
            enable='between(t,0,{total_duration})'[box];

        [box]drawbox=x=0:y={bar_y}:w={accent_width}:h={bar_height}:
            color={style_config['accent_color']}:t=fill[accent];

        [accent]drawtext=text='{text}':
            fontfile=/System/Library/Fonts/Helvetica.ttc:
            fontsize=42:fontcolor={style_config['text_color']}:
            x={accent_width + 20}:y={bar_y + 20}:
            alpha='if(lt(t,{fade_in}),t/{fade_in},if(lt(t,{fade_in + hold_duration}),1,(1-(t-{fade_in + hold_duration})/{fade_out})))'[title];

        [title]drawtext=text='{subtitle}':
            fontfile=/System/Library/Fonts/Helvetica.ttc:
            fontsize=24:fontcolor={style_config['text_color']}@0.8:
            x={accent_width + 20}:y={bar_y + 65}:
            alpha='if(lt(t,{fade_in}),t/{fade_in},if(lt(t,{fade_in + hold_duration}),1,(1-(t-{fade_in + hold_duration})/{fade_out})))'[out]
        """

        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", f"color=c=black@0:s={self.config.width}x{self.config.height}:d={total_duration}:r={self.config.fps}",
            "-filter_complex", filter_complex.replace("\n", ""),
            "-map", "[out]",
            "-c:v", "prores_ks", "-profile:v", "4444",
            "-pix_fmt", "yuva444p10le",
            "-t", str(total_duration),
            output
        ]

        return run_ffmpeg(cmd, f"Creating {style} lower third")


class TextAnimator:
    """Generate animated text effects."""

    def __init__(self, config: AnimationConfig):
        self.config = config

    def fade_in_out(
        self,
        text: str,
        output: str,
        font_size: int = 72,
        color: str = "white",
        duration: float = 5.0
    ) -> bool:
        """Text that fades in, holds, then fades out."""

        fade_time = 1.0
        hold_time = duration - (fade_time * 2)

        filter_complex = f"""
        color=c=black@0:s={self.config.width}x{self.config.height}:d={duration}:r={self.config.fps},
        drawtext=text='{text}':
            fontfile=/System/Library/Fonts/Helvetica.ttc:
            fontsize={font_size}:fontcolor={color}:
            x=(w-text_w)/2:y=(h-text_h)/2:
            alpha='if(lt(t,{fade_time}),t/{fade_time},if(lt(t,{fade_time + hold_time}),1,(1-(t-{fade_time + hold_time})/{fade_time})))'
        """

        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", f"color=c=black@0:s={self.config.width}x{self.config.height}:d={duration}",
            "-vf", filter_complex.replace("\n", ""),
            "-c:v", "prores_ks", "-profile:v", "4444",
            "-pix_fmt", "yuva444p10le",
            output
        ]

        return run_ffmpeg(cmd, "Creating fade text animation")

    def typewriter(
        self,
        text: str,
        output: str,
        font_size: int = 48,
        chars_per_second: float = 10.0
    ) -> bool:
        """Typewriter effect - text appears character by character."""

        duration = len(text) / chars_per_second + 2.0  # Extra time at end

        # Build drawtext with enable for each character
        filter_parts = [f"color=c=black@0:s={self.config.width}x{self.config.height}:d={duration}:r={self.config.fps}"]

        for i, char in enumerate(text):
            if char == " ":
                continue
            start_time = i / chars_per_second
            # Escape special characters
            escaped_char = char.replace("'", "'\\''").replace(":", "\\:")
            filter_parts.append(
                f"drawtext=text='{escaped_char}':"
                f"fontfile=/System/Library/Fonts/Courier.dfont:"
                f"fontsize={font_size}:fontcolor=white:"
                f"x=100+{i}*{font_size*0.6}:y=(h-text_h)/2:"
                f"enable='gte(t,{start_time})'"
            )

        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", f"color=c=black@0:s={self.config.width}x{self.config.height}:d={duration}",
            "-vf", ",".join(filter_parts),
            "-c:v", "prores_ks", "-profile:v", "4444",
            "-pix_fmt", "yuva444p10le",
            output
        ]

        return run_ffmpeg(cmd, "Creating typewriter animation")

    def scale_bounce(
        self,
        text: str,
        output: str,
        font_size: int = 96,
        duration: float = 3.0
    ) -> bool:
        """Text that scales up with a bounce effect."""

        # Using zoompan for scale animation
        filter_complex = f"""
        color=c=black:s={self.config.width}x{self.config.height}:d={duration}:r={self.config.fps},
        drawtext=text='{text}':
            fontfile=/System/Library/Fonts/Helvetica.ttc:
            fontsize={font_size}:fontcolor=white:
            x=(w-text_w)/2:y=(h-text_h)/2
        """

        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", f"color=c=black:s={self.config.width}x{self.config.height}:d={duration}",
            "-vf", filter_complex.replace("\n", ""),
            "-c:v", "libx264", "-crf", "18",
            output
        ]

        return run_ffmpeg(cmd, "Creating scale bounce animation")


class ProgressBarGenerator:
    """Generate animated progress bars and timers."""

    def __init__(self, config: AnimationConfig):
        self.config = config

    def horizontal_bar(
        self,
        output: str,
        duration: float = 10.0,
        bar_color: str = "0x4ecdc4",
        bg_color: str = "0x333333",
        height: int = 20
    ) -> bool:
        """Generate a horizontal progress bar that fills over time."""

        bar_y = self.config.height - height - 20

        filter_complex = f"""
        color=c=black@0:s={self.config.width}x{self.config.height}:d={duration}:r={self.config.fps},
        drawbox=x=20:y={bar_y}:w={self.config.width - 40}:h={height}:
            color={bg_color}:t=fill,
        drawbox=x=20:y={bar_y}:w='(t/{duration})*{self.config.width - 40}':h={height}:
            color={bar_color}:t=fill
        """

        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", f"color=c=black@0:s={self.config.width}x{self.config.height}:d={duration}",
            "-vf", filter_complex.replace("\n", ""),
            "-c:v", "prores_ks", "-profile:v", "4444",
            "-pix_fmt", "yuva444p10le",
            output
        ]

        return run_ffmpeg(cmd, "Creating progress bar")

    def countdown_timer(
        self,
        output: str,
        duration: float = 10.0,
        font_size: int = 120
    ) -> bool:
        """Generate a countdown timer."""

        filter_complex = f"""
        color=c=black@0:s={self.config.width}x{self.config.height}:d={duration}:r={self.config.fps},
        drawtext=text='%{{eif\\:{duration}-t\\:d}}':
            fontfile=/System/Library/Fonts/Helvetica.ttc:
            fontsize={font_size}:fontcolor=white:
            x=(w-text_w)/2:y=(h-text_h)/2
        """

        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", f"color=c=black@0:s={self.config.width}x{self.config.height}:d={duration}",
            "-vf", filter_complex.replace("\n", ""),
            "-c:v", "prores_ks", "-profile:v", "4444",
            "-pix_fmt", "yuva444p10le",
            output
        ]

        return run_ffmpeg(cmd, "Creating countdown timer")


class LogoOverlay:
    """Overlay logos and watermarks on video."""

    POSITIONS = {
        "top-left": "20:20",
        "top-right": "W-w-20:20",
        "bottom-left": "20:H-h-20",
        "bottom-right": "W-w-20:H-h-20",
        "center": "(W-w)/2:(H-h)/2"
    }

    def __init__(self, config: AnimationConfig):
        self.config = config

    def overlay(
        self,
        video: str,
        logo: str,
        output: str,
        position: str = "bottom-right",
        scale: float = 0.15,
        opacity: float = 0.8,
        fade_in: float = 0.5
    ) -> bool:
        """Overlay a logo on video with optional fade-in."""

        pos = self.POSITIONS.get(position, self.POSITIONS["bottom-right"])

        filter_complex = f"""
        [1:v]scale=iw*{scale}:ih*{scale},
        format=rgba,
        colorchannelmixer=aa={opacity}[logo];
        [0:v][logo]overlay={pos}:
            enable='gte(t,0)'[out]
        """

        cmd = [
            "ffmpeg", "-y",
            "-i", video,
            "-i", logo,
            "-filter_complex", filter_complex.replace("\n", ""),
            "-map", "[out]",
            "-map", "0:a?",
            "-c:v", "libx264", "-crf", "18",
            "-c:a", "copy",
            output
        ]

        return run_ffmpeg(cmd, f"Overlaying logo at {position}")

    def animated_watermark(
        self,
        video: str,
        logo: str,
        output: str,
        animation: str = "pulse"
    ) -> bool:
        """Overlay logo with animation (pulse, rotate, bounce)."""

        if animation == "pulse":
            # Pulsing opacity effect
            filter_complex = f"""
            [1:v]scale=iw*0.1:ih*0.1,
            format=rgba,
            colorchannelmixer=aa='0.5+0.3*sin(t*3)'[logo];
            [0:v][logo]overlay=W-w-20:H-h-20[out]
            """
        else:
            # Default static
            filter_complex = f"""
            [1:v]scale=iw*0.1:ih*0.1[logo];
            [0:v][logo]overlay=W-w-20:H-h-20[out]
            """

        cmd = [
            "ffmpeg", "-y",
            "-i", video,
            "-i", logo,
            "-filter_complex", filter_complex.replace("\n", ""),
            "-map", "[out]",
            "-map", "0:a?",
            "-c:v", "libx264", "-crf", "18",
            "-c:a", "copy",
            output
        ]

        return run_ffmpeg(cmd, f"Creating {animation} watermark")


class TransitionGenerator:
    """Generate video transitions."""

    def __init__(self, config: AnimationConfig):
        self.config = config

    def crossfade(
        self,
        video1: str,
        video2: str,
        output: str,
        duration: float = 1.0
    ) -> bool:
        """Crossfade between two videos."""

        cmd = [
            "ffmpeg", "-y",
            "-i", video1,
            "-i", video2,
            "-filter_complex",
            f"[0:v][1:v]xfade=transition=fade:duration={duration}:offset=4[v];"
            f"[0:a][1:a]acrossfade=d={duration}[a]",
            "-map", "[v]",
            "-map", "[a]",
            "-c:v", "libx264", "-crf", "18",
            "-c:a", "aac", "-b:a", "192k",
            output
        ]

        return run_ffmpeg(cmd, "Creating crossfade transition")

    def wipe(
        self,
        video1: str,
        video2: str,
        output: str,
        direction: str = "left",
        duration: float = 1.0
    ) -> bool:
        """Wipe transition between two videos."""

        wipe_map = {
            "left": "wipeleft",
            "right": "wiperight",
            "up": "wipeup",
            "down": "wipedown"
        }

        transition = wipe_map.get(direction, "wipeleft")

        cmd = [
            "ffmpeg", "-y",
            "-i", video1,
            "-i", video2,
            "-filter_complex",
            f"[0:v][1:v]xfade=transition={transition}:duration={duration}:offset=4[v]",
            "-map", "[v]",
            "-c:v", "libx264", "-crf", "18",
            output
        ]

        return run_ffmpeg(cmd, f"Creating {direction} wipe transition")


def main():
    parser = argparse.ArgumentParser(
        description="Motion Graphics Generator for FFmpeg",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Lower third
    python motion_graphics.py lower-third --text "John Smith" --subtitle "CEO" -o lower_third.mov

    # Text animation
    python motion_graphics.py text-animate --text "Welcome" --style fade -o title.mov

    # Progress bar
    python motion_graphics.py progress-bar --duration 30 -o progress.mov

    # Logo overlay
    python motion_graphics.py logo-overlay --video input.mp4 --logo logo.png -o branded.mp4

    # Countdown timer
    python motion_graphics.py countdown --duration 10 -o countdown.mov

    # Transition
    python motion_graphics.py transition --video1 a.mp4 --video2 b.mp4 --type crossfade -o merged.mp4
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Lower third
    lt_parser = subparsers.add_parser("lower-third", help="Generate lower third graphic")
    lt_parser.add_argument("--text", required=True, help="Main text")
    lt_parser.add_argument("--subtitle", default="", help="Subtitle text")
    lt_parser.add_argument("--style", choices=["modern", "minimal", "corporate", "creative"], default="modern")
    lt_parser.add_argument("--hold", type=float, default=3.0, help="Hold duration in seconds")
    lt_parser.add_argument("-o", "--output", default="lower_third.mov", help="Output file")

    # Text animation
    text_parser = subparsers.add_parser("text-animate", help="Generate animated text")
    text_parser.add_argument("--text", required=True, help="Text to animate")
    text_parser.add_argument("--style", choices=["fade", "typewriter", "bounce"], default="fade")
    text_parser.add_argument("--font-size", type=int, default=72)
    text_parser.add_argument("--duration", type=float, default=5.0)
    text_parser.add_argument("-o", "--output", default="text_animation.mov", help="Output file")

    # Progress bar
    progress_parser = subparsers.add_parser("progress-bar", help="Generate progress bar")
    progress_parser.add_argument("--duration", type=float, default=10.0)
    progress_parser.add_argument("--color", default="0x4ecdc4", help="Bar color")
    progress_parser.add_argument("--height", type=int, default=20)
    progress_parser.add_argument("-o", "--output", default="progress.mov", help="Output file")

    # Logo overlay
    logo_parser = subparsers.add_parser("logo-overlay", help="Overlay logo on video")
    logo_parser.add_argument("--video", required=True, help="Input video")
    logo_parser.add_argument("--logo", required=True, help="Logo image")
    logo_parser.add_argument("--position", choices=["top-left", "top-right", "bottom-left", "bottom-right", "center"], default="bottom-right")
    logo_parser.add_argument("--scale", type=float, default=0.15, help="Logo scale (0.0-1.0)")
    logo_parser.add_argument("--opacity", type=float, default=0.8, help="Logo opacity (0.0-1.0)")
    logo_parser.add_argument("-o", "--output", default="branded.mp4", help="Output file")

    # Countdown
    countdown_parser = subparsers.add_parser("countdown", help="Generate countdown timer")
    countdown_parser.add_argument("--duration", type=float, default=10.0)
    countdown_parser.add_argument("--font-size", type=int, default=120)
    countdown_parser.add_argument("-o", "--output", default="countdown.mov", help="Output file")

    # Transition
    trans_parser = subparsers.add_parser("transition", help="Generate video transition")
    trans_parser.add_argument("--video1", required=True, help="First video")
    trans_parser.add_argument("--video2", required=True, help="Second video")
    trans_parser.add_argument("--type", choices=["crossfade", "wipe-left", "wipe-right", "wipe-up", "wipe-down"], default="crossfade")
    trans_parser.add_argument("--duration", type=float, default=1.0)
    trans_parser.add_argument("-o", "--output", default="transition.mp4", help="Output file")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    config = AnimationConfig()

    if args.command == "lower-third":
        generator = LowerThirdGenerator(config)
        success = generator.generate(
            text=args.text,
            subtitle=args.subtitle,
            style=args.style,
            output=args.output,
            hold_duration=args.hold
        )

    elif args.command == "text-animate":
        animator = TextAnimator(config)
        if args.style == "fade":
            success = animator.fade_in_out(args.text, args.output, args.font_size, duration=args.duration)
        elif args.style == "typewriter":
            success = animator.typewriter(args.text, args.output, args.font_size)
        elif args.style == "bounce":
            success = animator.scale_bounce(args.text, args.output, args.font_size, args.duration)

    elif args.command == "progress-bar":
        generator = ProgressBarGenerator(config)
        success = generator.horizontal_bar(
            output=args.output,
            duration=args.duration,
            bar_color=args.color,
            height=args.height
        )

    elif args.command == "logo-overlay":
        overlay = LogoOverlay(config)
        success = overlay.overlay(
            video=args.video,
            logo=args.logo,
            output=args.output,
            position=args.position,
            scale=args.scale,
            opacity=args.opacity
        )

    elif args.command == "countdown":
        generator = ProgressBarGenerator(config)
        success = generator.countdown_timer(
            output=args.output,
            duration=args.duration,
            font_size=args.font_size
        )

    elif args.command == "transition":
        generator = TransitionGenerator(config)
        if args.type == "crossfade":
            success = generator.crossfade(args.video1, args.video2, args.output, args.duration)
        else:
            direction = args.type.replace("wipe-", "")
            success = generator.wipe(args.video1, args.video2, args.output, direction, args.duration)

    if success:
        print(f"✅ Created: {args.output}")
    else:
        print("❌ Generation failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
