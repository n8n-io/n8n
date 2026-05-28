# TTS Video Clip Composer Workflow

This workflow is an automated video editing workflow for n8n. It is not an AI video generation workflow. The final image content comes from uploaded files: cover image, proof screenshot, and background video. The workflow generates TTS audio and timestamp-aligned subtitles, then uses FFmpeg to edit the final MP4.

## Files

- Workflow import file: `workflows/video-clip-tts-workflow.json`
- Composer script: `tools/video-composer/compose-video.mjs`
- Default job output: `/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/`

## Prerequisites

Install and verify the local tools used by the workflow and composer:

```bash
node --version
ffmpeg -version
ffprobe -version
pnpm --version
```

The composer prefers the FFmpeg `subtitles` video filter for hard subtitles. Confirm whether the local FFmpeg build includes it:

```bash
ffmpeg -hide_banner -filters | rg "subtitles"
```

If the filter is unavailable, the composer falls back to generated transparent subtitle frames and overlays those frames with FFmpeg. This keeps the final MP4 self-contained with visible subtitles even when the system FFmpeg was built without `libass`.

## Environment Variables

Copy the local env template and fill in the real Doubao/Volcengine TTS values:

```bash
cp .env.video-clip.example .env.video-clip
```

Then edit `.env.video-clip`. Do not commit real TTS secrets. The local `.env.video-clip` file is ignored by git.

`NODE_FUNCTION_ALLOW_BUILTIN=fs,child_process` is required for this MVP because the imported workflow uses n8n Code nodes to write uploaded files, TTS responses, and `job.json` to the job directory, then runs the local video composer script.

`N8N_BLOCK_ENV_ACCESS_IN_NODE=false` is required because this workflow reads the Doubao TTS settings from environment variables through n8n expressions.

## Import

1. Start n8n from the repository root with the local env file:

```bash
scripts/start-video-clip-n8n.sh
```

2. Open `http://localhost:5678`.
3. Import `workflows/video-clip-tts-workflow.json`.
4. Open the form or test URL for the `Upload Assets` node.

## Inputs

Upload all four files:

- `cover_image`: `png`, `jpg`, `jpeg`, or `webp`
- `proof_screenshot`: `png`, `jpg`, `jpeg`, or `webp`
- `tts_script`: `txt` or `md`
- `background_video`: `mp4`, `mov`, or `webm`

The workflow saves uploaded files under `/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/inputs/`, normalizes the TTS script to trimmed text, sends the text to Doubao TTS with `enable_timestamp: true`, writes the returned audio and timing metadata under `/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/tts/`, then runs the composer against `/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/job.json`.

## Output Layout

- `0s - 3s`: cover image large display
- `3s - 7s`: proof screenshot large display
- `7s - end`: cover image top-left, proof screenshot top-right, background video underneath, TTS subtitles at bottom

The generated subtitle file is written to `/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/render/subtitles.ass`. When Doubao returns usable word timestamps, the ASS dialogue timing is built from those timestamps. If no usable timestamps are present, the composer falls back to duration-based script splitting. The final MP4 and FFmpeg log are written under `/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/render/`.

## Result JSON

The workflow responds with JSON in this shape:

```json
{
  "ok": true,
  "jobId": "20260528-101530-a8f42c",
  "videoPath": "/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/20260528-101530-a8f42c/render/final.mp4",
  "jobDir": "/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/20260528-101530-a8f42c",
  "ffmpegLog": "/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/20260528-101530-a8f42c/render/ffmpeg.log",
  "size": 1234567
}
```

## Troubleshooting

If a Code node fails with a built-in module or env access error, confirm `.env.video-clip` contains:

```bash
NODE_FUNCTION_ALLOW_BUILTIN=fs,child_process
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

For the current Volcengine V3 endpoint this workflow uses the old-console headers
`X-Api-App-Id` and `X-Api-Access-Key`, plus `X-Api-Resource-Id`. In the local env file,
set `DOUBAO_TTS_RESOURCE_ID=seed-tts-2.0` unless your selected speaker requires a different
resource ID.

If TTS fails, inspect:

```text
/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/tts/tts-response.json
/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/tts/timing.json
```

If video rendering fails, inspect:

```text
/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/job.json
/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/render/ffmpeg.log
```

If FFmpeg reports an unknown filter or subtitle rendering error, verify whether the local FFmpeg build includes the `subtitles` filter:

```bash
ffmpeg -hide_banner -filters | rg "subtitles"
```

Re-run the composer directly:

```bash
node tools/video-composer/compose-video.mjs /Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/job.json
```

## Local Composer Tests

Run unit tests:

```bash
node --test tools/video-composer/compose-video.test.mjs
```

Run the FFmpeg smoke render:

```bash
RUN_VIDEO_COMPOSER_SMOKE=1 node --test tools/video-composer/compose-video.test.mjs
```

The smoke render creates synthetic media and validates that the composer writes `final.mp4`, `subtitles.ass`, and `ffmpeg.log`.
