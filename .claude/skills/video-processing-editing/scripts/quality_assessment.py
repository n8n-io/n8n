#!/usr/bin/env python3
"""
Video Quality Assessment Tool

Measures video quality using industry-standard metrics:
- VMAF (Video Multi-Method Assessment Fusion) - Netflix's perceptual quality metric
- PSNR (Peak Signal-to-Noise Ratio) - Traditional quality metric
- SSIM (Structural Similarity Index) - Perceptual quality metric

Usage:
    python quality_assessment.py compare --reference original.mp4 --distorted encoded.mp4
    python quality_assessment.py analyze --video encoded.mp4
    python quality_assessment.py batch --dir ./videos --reference master.mp4
    python quality_assessment.py report --reference orig.mp4 --distorted enc.mp4 --format html
"""

import argparse
import subprocess
import sys
import json
import os
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any
from datetime import datetime
import statistics


@dataclass
class QualityMetrics:
    """Container for video quality metrics."""
    vmaf: Optional[float] = None
    vmaf_min: Optional[float] = None
    vmaf_max: Optional[float] = None
    vmaf_std: Optional[float] = None
    psnr: Optional[float] = None
    psnr_min: Optional[float] = None
    psnr_max: Optional[float] = None
    ssim: Optional[float] = None
    ssim_min: Optional[float] = None
    ssim_max: Optional[float] = None
    ms_ssim: Optional[float] = None


@dataclass
class VideoInfo:
    """Container for video metadata."""
    filename: str
    duration: float
    width: int
    height: int
    fps: float
    bitrate: int
    codec: str
    pixel_format: str
    file_size: int


@dataclass
class QualityReport:
    """Complete quality assessment report."""
    reference: VideoInfo
    distorted: VideoInfo
    metrics: QualityMetrics
    timestamp: str
    compression_ratio: float
    quality_grade: str


def get_video_info(video_path: str) -> Optional[VideoInfo]:
    """Extract video metadata using ffprobe."""
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        video_path
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)

        # Find video stream
        video_stream = None
        for stream in data.get("streams", []):
            if stream.get("codec_type") == "video":
                video_stream = stream
                break

        if not video_stream:
            print(f"❌ No video stream found in {video_path}")
            return None

        format_info = data.get("format", {})

        # Parse frame rate
        fps_str = video_stream.get("r_frame_rate", "30/1")
        if "/" in fps_str:
            num, den = fps_str.split("/")
            fps = float(num) / float(den)
        else:
            fps = float(fps_str)

        return VideoInfo(
            filename=os.path.basename(video_path),
            duration=float(format_info.get("duration", 0)),
            width=int(video_stream.get("width", 0)),
            height=int(video_stream.get("height", 0)),
            fps=fps,
            bitrate=int(format_info.get("bit_rate", 0)),
            codec=video_stream.get("codec_name", "unknown"),
            pixel_format=video_stream.get("pix_fmt", "unknown"),
            file_size=int(format_info.get("size", 0))
        )

    except subprocess.CalledProcessError as e:
        print(f"❌ ffprobe error: {e.stderr}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        return None


def calculate_vmaf(reference: str, distorted: str, log_path: str = None) -> Optional[Dict[str, float]]:
    """Calculate VMAF score between reference and distorted video."""

    log_path = log_path or "/tmp/vmaf_log.json"

    # Check if libvmaf is available
    cmd = [
        "ffmpeg", "-y",
        "-i", distorted,
        "-i", reference,
        "-lavfi", f"libvmaf=log_fmt=json:log_path={log_path}:n_threads=4",
        "-f", "null", "-"
    ]

    print("📊 Calculating VMAF (this may take a while)...")

    try:
        result = subprocess.run(cmd, capture_output=True, text=True)

        # Parse VMAF log
        if os.path.exists(log_path):
            with open(log_path) as f:
                vmaf_data = json.load(f)

            pooled = vmaf_data.get("pooled_metrics", {})
            vmaf_info = pooled.get("vmaf", {})

            return {
                "vmaf": vmaf_info.get("mean"),
                "vmaf_min": vmaf_info.get("min"),
                "vmaf_max": vmaf_info.get("max"),
                "vmaf_std": vmaf_info.get("harmonic_mean")
            }

    except subprocess.CalledProcessError as e:
        print(f"⚠️  VMAF calculation failed: {e.stderr}")
        print("   Make sure FFmpeg is compiled with libvmaf support")

    return None


def calculate_psnr_ssim(reference: str, distorted: str) -> Dict[str, float]:
    """Calculate PSNR and SSIM between reference and distorted video."""

    cmd = [
        "ffmpeg", "-y",
        "-i", distorted,
        "-i", reference,
        "-lavfi", "[0:v][1:v]psnr=stats_file=/tmp/psnr.log;[0:v][1:v]ssim=stats_file=/tmp/ssim.log",
        "-f", "null", "-"
    ]

    print("📊 Calculating PSNR and SSIM...")

    metrics = {}

    try:
        result = subprocess.run(cmd, capture_output=True, text=True)

        # Parse PSNR from stderr (FFmpeg outputs stats there)
        stderr = result.stderr
        for line in stderr.split("\n"):
            if "PSNR" in line and "average" in line:
                # Extract average PSNR
                parts = line.split()
                for i, part in enumerate(parts):
                    if part.startswith("average:"):
                        metrics["psnr"] = float(parts[i].replace("average:", ""))
                    elif part.startswith("min:"):
                        metrics["psnr_min"] = float(parts[i].replace("min:", ""))
                    elif part.startswith("max:"):
                        metrics["psnr_max"] = float(parts[i].replace("max:", ""))

            if "SSIM" in line and "All:" in line:
                # Extract SSIM
                parts = line.split()
                for i, part in enumerate(parts):
                    if part.startswith("All:"):
                        ssim_val = parts[i].replace("All:", "")
                        metrics["ssim"] = float(ssim_val)

        # Parse log files for more detailed stats
        if os.path.exists("/tmp/psnr.log"):
            psnr_values = []
            with open("/tmp/psnr.log") as f:
                for line in f:
                    if "psnr_avg" in line:
                        parts = line.split()
                        for part in parts:
                            if part.startswith("psnr_avg:"):
                                psnr_values.append(float(part.replace("psnr_avg:", "")))
            if psnr_values:
                metrics["psnr"] = statistics.mean(psnr_values)
                metrics["psnr_min"] = min(psnr_values)
                metrics["psnr_max"] = max(psnr_values)

        if os.path.exists("/tmp/ssim.log"):
            ssim_values = []
            with open("/tmp/ssim.log") as f:
                for line in f:
                    if "All:" in line:
                        parts = line.split()
                        for part in parts:
                            if part.startswith("All:"):
                                ssim_values.append(float(part.replace("All:", "")))
            if ssim_values:
                metrics["ssim"] = statistics.mean(ssim_values)
                metrics["ssim_min"] = min(ssim_values)
                metrics["ssim_max"] = max(ssim_values)

    except subprocess.CalledProcessError as e:
        print(f"⚠️  PSNR/SSIM calculation failed: {e.stderr}")

    return metrics


def calculate_bitrate_quality(video_path: str) -> Dict[str, Any]:
    """Analyze video quality based on bitrate and resolution."""

    info = get_video_info(video_path)
    if not info:
        return {}

    # Calculate bits per pixel
    pixels_per_frame = info.width * info.height
    bits_per_second = info.bitrate
    bpp = bits_per_second / (pixels_per_frame * info.fps)

    # Quality estimation based on BPP
    # These are rough guidelines for H.264
    if bpp >= 0.1:
        estimated_quality = "Excellent"
    elif bpp >= 0.07:
        estimated_quality = "Good"
    elif bpp >= 0.05:
        estimated_quality = "Acceptable"
    elif bpp >= 0.03:
        estimated_quality = "Low"
    else:
        estimated_quality = "Poor"

    return {
        "bits_per_pixel": round(bpp, 4),
        "estimated_quality": estimated_quality,
        "bitrate_mbps": round(info.bitrate / 1_000_000, 2),
        "resolution": f"{info.width}x{info.height}",
        "file_size_mb": round(info.file_size / 1_000_000, 2)
    }


def quality_grade(metrics: QualityMetrics) -> str:
    """Assign a letter grade based on VMAF score."""
    if metrics.vmaf is None:
        if metrics.ssim and metrics.ssim >= 0.95:
            return "A"
        elif metrics.psnr and metrics.psnr >= 40:
            return "A"
        return "Unknown"

    vmaf = metrics.vmaf
    if vmaf >= 93:
        return "A+"
    elif vmaf >= 87:
        return "A"
    elif vmaf >= 80:
        return "B+"
    elif vmaf >= 70:
        return "B"
    elif vmaf >= 60:
        return "C"
    elif vmaf >= 50:
        return "D"
    else:
        return "F"


def generate_html_report(report: QualityReport, output_path: str):
    """Generate an HTML quality report."""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Quality Assessment Report</title>
    <style>
        :root {{
            --bg-dark: #1a1a2e;
            --bg-card: #16213e;
            --accent: #4ecdc4;
            --accent-alt: #ff6b6b;
            --text: #eee;
            --text-muted: #aaa;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-dark);
            color: var(--text);
            padding: 2rem;
            line-height: 1.6;
        }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        h1 {{
            font-size: 2rem;
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, var(--accent), var(--accent-alt));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}
        .timestamp {{ color: var(--text-muted); margin-bottom: 2rem; }}
        .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }}
        .card {{
            background: var(--bg-card);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }}
        .card h2 {{
            font-size: 1rem;
            color: var(--accent);
            margin-bottom: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .metric {{
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }}
        .metric:last-child {{ border-bottom: none; }}
        .metric-label {{ color: var(--text-muted); }}
        .metric-value {{ font-weight: 600; }}
        .grade {{
            font-size: 4rem;
            font-weight: bold;
            text-align: center;
            padding: 2rem;
            background: linear-gradient(135deg, var(--accent), var(--accent-alt));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}
        .grade-label {{
            text-align: center;
            color: var(--text-muted);
            font-size: 0.9rem;
        }}
        .vmaf-bar {{
            height: 20px;
            background: linear-gradient(90deg, #ff6b6b 0%, #ffd93d 50%, #4ecdc4 100%);
            border-radius: 10px;
            position: relative;
            margin: 1rem 0;
        }}
        .vmaf-marker {{
            position: absolute;
            top: -8px;
            width: 4px;
            height: 36px;
            background: white;
            border-radius: 2px;
            transform: translateX(-50%);
        }}
        .comparison {{ margin-top: 2rem; }}
        .comparison table {{ width: 100%; border-collapse: collapse; }}
        .comparison th, .comparison td {{
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }}
        .comparison th {{ color: var(--accent); font-weight: 500; }}
        .good {{ color: #4ecdc4; }}
        .warning {{ color: #ffd93d; }}
        .bad {{ color: #ff6b6b; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🎬 Video Quality Assessment</h1>
        <p class="timestamp">Generated: {report.timestamp}</p>

        <div class="grid">
            <div class="card">
                <h2>Quality Grade</h2>
                <div class="grade">{report.quality_grade}</div>
                <div class="grade-label">Based on VMAF Score</div>
            </div>

            <div class="card">
                <h2>VMAF Score</h2>
                <div class="vmaf-bar">
                    <div class="vmaf-marker" style="left: {report.metrics.vmaf or 0}%"></div>
                </div>
                <div class="metric">
                    <span class="metric-label">Mean</span>
                    <span class="metric-value">{report.metrics.vmaf or 'N/A':.2f}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Min</span>
                    <span class="metric-value">{report.metrics.vmaf_min or 'N/A'}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Max</span>
                    <span class="metric-value">{report.metrics.vmaf_max or 'N/A'}</span>
                </div>
            </div>

            <div class="card">
                <h2>Technical Metrics</h2>
                <div class="metric">
                    <span class="metric-label">PSNR</span>
                    <span class="metric-value">{report.metrics.psnr or 'N/A':.2f} dB</span>
                </div>
                <div class="metric">
                    <span class="metric-label">SSIM</span>
                    <span class="metric-value">{report.metrics.ssim or 'N/A':.4f}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Compression</span>
                    <span class="metric-value">{report.compression_ratio:.1f}x</span>
                </div>
            </div>

            <div class="card">
                <h2>Reference Video</h2>
                <div class="metric">
                    <span class="metric-label">File</span>
                    <span class="metric-value">{report.reference.filename}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Resolution</span>
                    <span class="metric-value">{report.reference.width}x{report.reference.height}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Bitrate</span>
                    <span class="metric-value">{report.reference.bitrate // 1000} kbps</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Size</span>
                    <span class="metric-value">{report.reference.file_size // 1000000} MB</span>
                </div>
            </div>

            <div class="card">
                <h2>Encoded Video</h2>
                <div class="metric">
                    <span class="metric-label">File</span>
                    <span class="metric-value">{report.distorted.filename}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Resolution</span>
                    <span class="metric-value">{report.distorted.width}x{report.distorted.height}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Bitrate</span>
                    <span class="metric-value">{report.distorted.bitrate // 1000} kbps</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Size</span>
                    <span class="metric-value">{report.distorted.file_size // 1000000} MB</span>
                </div>
            </div>
        </div>

        <div class="comparison card" style="margin-top: 2rem;">
            <h2>Quality Interpretation</h2>
            <table>
                <tr>
                    <th>VMAF Range</th>
                    <th>Quality</th>
                    <th>Description</th>
                </tr>
                <tr class="{'good' if (report.metrics.vmaf or 0) >= 93 else ''}">
                    <td>93-100</td>
                    <td>Excellent (A+)</td>
                    <td>Visually indistinguishable from reference</td>
                </tr>
                <tr class="{'good' if 87 <= (report.metrics.vmaf or 0) < 93 else ''}">
                    <td>87-93</td>
                    <td>Very Good (A)</td>
                    <td>High quality, minor differences possible</td>
                </tr>
                <tr class="{'warning' if 70 <= (report.metrics.vmaf or 0) < 87 else ''}">
                    <td>70-87</td>
                    <td>Good (B)</td>
                    <td>Acceptable for most use cases</td>
                </tr>
                <tr class="{'bad' if (report.metrics.vmaf or 0) < 70 else ''}">
                    <td>&lt;70</td>
                    <td>Fair/Poor</td>
                    <td>Visible quality loss, consider higher bitrate</td>
                </tr>
            </table>
        </div>
    </div>
</body>
</html>"""

    with open(output_path, "w") as f:
        f.write(html)

    print(f"📄 HTML report saved to: {output_path}")


def compare_videos(reference: str, distorted: str, output_format: str = "text") -> Optional[QualityReport]:
    """Compare two videos and generate quality metrics."""

    print(f"\n🎬 Comparing videos:")
    print(f"   Reference: {reference}")
    print(f"   Distorted: {distorted}\n")

    # Get video info
    ref_info = get_video_info(reference)
    dist_info = get_video_info(distorted)

    if not ref_info or not dist_info:
        return None

    # Calculate metrics
    metrics = QualityMetrics()

    # VMAF (may not be available on all systems)
    vmaf_result = calculate_vmaf(reference, distorted)
    if vmaf_result:
        metrics.vmaf = vmaf_result.get("vmaf")
        metrics.vmaf_min = vmaf_result.get("vmaf_min")
        metrics.vmaf_max = vmaf_result.get("vmaf_max")

    # PSNR and SSIM
    psnr_ssim = calculate_psnr_ssim(reference, distorted)
    metrics.psnr = psnr_ssim.get("psnr")
    metrics.psnr_min = psnr_ssim.get("psnr_min")
    metrics.psnr_max = psnr_ssim.get("psnr_max")
    metrics.ssim = psnr_ssim.get("ssim")
    metrics.ssim_min = psnr_ssim.get("ssim_min")
    metrics.ssim_max = psnr_ssim.get("ssim_max")

    # Calculate compression ratio
    compression_ratio = ref_info.file_size / dist_info.file_size if dist_info.file_size > 0 else 1.0

    # Generate report
    report = QualityReport(
        reference=ref_info,
        distorted=dist_info,
        metrics=metrics,
        timestamp=datetime.now().isoformat(),
        compression_ratio=compression_ratio,
        quality_grade=quality_grade(metrics)
    )

    return report


def print_report(report: QualityReport):
    """Print quality report to console."""

    print("\n" + "=" * 60)
    print("📊 VIDEO QUALITY ASSESSMENT REPORT")
    print("=" * 60)

    print(f"\n🎯 Quality Grade: {report.quality_grade}")
    print(f"📦 Compression Ratio: {report.compression_ratio:.2f}x")

    print("\n📈 Metrics:")
    print(f"   VMAF:  {report.metrics.vmaf:.2f}" if report.metrics.vmaf else "   VMAF:  N/A (libvmaf not available)")
    print(f"   PSNR:  {report.metrics.psnr:.2f} dB" if report.metrics.psnr else "   PSNR:  N/A")
    print(f"   SSIM:  {report.metrics.ssim:.4f}" if report.metrics.ssim else "   SSIM:  N/A")

    print("\n📁 Reference Video:")
    print(f"   File: {report.reference.filename}")
    print(f"   Resolution: {report.reference.width}x{report.reference.height}")
    print(f"   Bitrate: {report.reference.bitrate // 1000} kbps")
    print(f"   Size: {report.reference.file_size // 1000000} MB")

    print("\n📁 Encoded Video:")
    print(f"   File: {report.distorted.filename}")
    print(f"   Resolution: {report.distorted.width}x{report.distorted.height}")
    print(f"   Bitrate: {report.distorted.bitrate // 1000} kbps")
    print(f"   Size: {report.distorted.file_size // 1000000} MB")

    print("\n" + "=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Video Quality Assessment Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Compare two videos
    python quality_assessment.py compare --reference original.mp4 --distorted encoded.mp4

    # Generate HTML report
    python quality_assessment.py compare --reference orig.mp4 --distorted enc.mp4 --format html -o report.html

    # Analyze single video (bitrate quality estimation)
    python quality_assessment.py analyze --video encoded.mp4

    # Batch comparison
    python quality_assessment.py batch --reference master.mp4 --dir ./encodes/

Quality Grade Interpretation:
    A+ (93+):  Visually indistinguishable from reference
    A  (87+):  Excellent quality, minimal artifacts
    B+ (80+):  Very good quality
    B  (70+):  Good quality, acceptable for most uses
    C  (60+):  Acceptable, some visible artifacts
    D  (50+):  Poor quality, noticeable degradation
    F  (<50):  Unacceptable quality
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Compare command
    compare_parser = subparsers.add_parser("compare", help="Compare two videos")
    compare_parser.add_argument("--reference", "-r", required=True, help="Reference (original) video")
    compare_parser.add_argument("--distorted", "-d", required=True, help="Distorted (encoded) video")
    compare_parser.add_argument("--format", choices=["text", "json", "html"], default="text", help="Output format")
    compare_parser.add_argument("-o", "--output", help="Output file for report")

    # Analyze command
    analyze_parser = subparsers.add_parser("analyze", help="Analyze single video quality")
    analyze_parser.add_argument("--video", "-v", required=True, help="Video to analyze")

    # Batch command
    batch_parser = subparsers.add_parser("batch", help="Batch compare multiple videos")
    batch_parser.add_argument("--reference", "-r", required=True, help="Reference video")
    batch_parser.add_argument("--dir", "-d", required=True, help="Directory of videos to compare")
    batch_parser.add_argument("--format", choices=["text", "json"], default="text", help="Output format")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command == "compare":
        report = compare_videos(args.reference, args.distorted)

        if report:
            if args.format == "text":
                print_report(report)
            elif args.format == "json":
                output = args.output or "quality_report.json"
                with open(output, "w") as f:
                    json.dump(asdict(report), f, indent=2, default=str)
                print(f"✅ JSON report saved to: {output}")
            elif args.format == "html":
                output = args.output or "quality_report.html"
                generate_html_report(report, output)

    elif args.command == "analyze":
        info = get_video_info(args.video)
        if info:
            analysis = calculate_bitrate_quality(args.video)
            print("\n📊 Video Analysis:")
            print(f"   File: {info.filename}")
            print(f"   Resolution: {info.width}x{info.height}")
            print(f"   Codec: {info.codec}")
            print(f"   Bitrate: {analysis.get('bitrate_mbps')} Mbps")
            print(f"   Bits/Pixel: {analysis.get('bits_per_pixel')}")
            print(f"   Estimated Quality: {analysis.get('estimated_quality')}")
            print(f"   File Size: {analysis.get('file_size_mb')} MB")

    elif args.command == "batch":
        video_dir = Path(args.dir)
        videos = list(video_dir.glob("*.mp4")) + list(video_dir.glob("*.mkv")) + list(video_dir.glob("*.mov"))

        results = []
        for video in videos:
            if str(video) == args.reference:
                continue
            report = compare_videos(args.reference, str(video))
            if report:
                results.append({
                    "file": report.distorted.filename,
                    "vmaf": report.metrics.vmaf,
                    "psnr": report.metrics.psnr,
                    "ssim": report.metrics.ssim,
                    "grade": report.quality_grade,
                    "compression": report.compression_ratio
                })

        if results:
            print("\n📊 Batch Comparison Results:")
            print("-" * 80)
            print(f"{'File':<30} {'VMAF':>8} {'PSNR':>8} {'SSIM':>8} {'Grade':>6} {'Ratio':>8}")
            print("-" * 80)
            for r in results:
                vmaf = f"{r['vmaf']:.1f}" if r['vmaf'] else "N/A"
                psnr = f"{r['psnr']:.1f}" if r['psnr'] else "N/A"
                ssim = f"{r['ssim']:.3f}" if r['ssim'] else "N/A"
                print(f"{r['file']:<30} {vmaf:>8} {psnr:>8} {ssim:>8} {r['grade']:>6} {r['compression']:>7.1f}x")


if __name__ == "__main__":
    main()
