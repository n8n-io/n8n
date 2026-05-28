# TTS Video Clip Composer Workflow

This workflow is an automated video editing workflow for n8n. It is not an AI video generation workflow. The final image content comes from uploaded files: cover image, proof screenshot, and background video. The workflow generates TTS audio and subtitles, then uses FFmpeg to edit the final MP4.

## Files

- Workflow import file: `workflows/video-clip-tts-workflow.json`
- Composer script: `tools/video-composer/compose-video.mjs`
- Default job output: `/tmp/n8n-video-jobs/{jobId}/`

## Prerequisites

Install and verify the local tools used by the workflow and composer:

```bash
node --version
ffmpeg -version
ffprobe -version
pnpm --version
```

The composer uses the FFmpeg `subtitles` video filter. Confirm the local FFmpeg build includes it:

```bash
ffmpeg -hide_banner -filters | rg "subtitles"
```

The local smoke test skips the render case when `ffmpeg`, `ffprobe`, or the `subtitles` filter is unavailable.

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

The workflow saves uploaded files under `/tmp/n8n-video-jobs/{jobId}/inputs/`, normalizes the TTS script to trimmed text, sends the text to Doubao TTS, writes the returned audio under `/tmp/n8n-video-jobs/{jobId}/tts/`, then runs the composer against `/tmp/n8n-video-jobs/{jobId}/job.json`.

## Output Layout

- `0s - 3s`: cover image large display
- `3s - 7s`: proof screenshot large display
- `7s - end`: cover image top-left, proof screenshot top-right, background video underneath, TTS subtitles at bottom

The generated subtitle file is written to `/tmp/n8n-video-jobs/{jobId}/render/subtitles.ass`. The final MP4 and FFmpeg log are written under `/tmp/n8n-video-jobs/{jobId}/render/`.

## Result JSON

The workflow responds with JSON in this shape:

```json
{
  "ok": true,
  "jobId": "20260528-101530-a8f42c",
  "videoPath": "/tmp/n8n-video-jobs/20260528-101530-a8f42c/render/final.mp4",
  "jobDir": "/tmp/n8n-video-jobs/20260528-101530-a8f42c",
  "ffmpegLog": "/tmp/n8n-video-jobs/20260528-101530-a8f42c/render/ffmpeg.log",
  "size": 1234567
}
```

## Troubleshooting

If a Code node fails with a built-in module or env access error, confirm `.env.video-clip` contains:

```bash
NODE_FUNCTION_ALLOW_BUILTIN=fs,child_process
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

If TTS fails, inspect:

```text
/tmp/n8n-video-jobs/{jobId}/tts/tts-response.json
```

If video rendering fails, inspect:

```text
/tmp/n8n-video-jobs/{jobId}/job.json
/tmp/n8n-video-jobs/{jobId}/render/ffmpeg.log
```

If FFmpeg reports an unknown filter or subtitle rendering error, verify the local FFmpeg build includes the `subtitles` filter:

```bash
ffmpeg -hide_banner -filters | rg "subtitles"
```

Re-run the composer directly:

```bash
node tools/video-composer/compose-video.mjs /tmp/n8n-video-jobs/{jobId}/job.json
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

The smoke render creates synthetic media and validates that the composer writes `final.mp4`, `subtitles.ass`, and `ffmpeg.log`. It skips the render case when the local FFmpeg installation cannot support the required render path.
