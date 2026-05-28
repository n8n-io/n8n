# TTS Video Clip Composer Workflow

This workflow is an automated video editing workflow for n8n. It is not an AI video generation workflow. The final visual content comes from uploaded files: cover image, proof screenshot, and background video. The AI step only expands the user's viewpoint into a TTS script.

## Files

- Workflow import file: `workflows/video-clip-tts-workflow.json`
- Script writer prompt: `tools/video-composer/script-writer/SKILL.md`
- Workflow utilities: `tools/video-composer/workflow-utils.mjs`
- Composer script: `tools/video-composer/compose-video.mjs`
- Default job output: `/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/`

## Prerequisites

Install and verify local tools:

```bash
node --version
ffmpeg -version
ffprobe -version
pnpm --version
```

The composer prefers the FFmpeg `subtitles` video filter for hard subtitles:

```bash
ffmpeg -hide_banner -filters | rg "subtitles"
```

## Environment Variables

Copy the local env template and fill in the real Doubao/Volcengine values:

```bash
cp .env.video-clip.example .env.video-clip
```

Do not commit real secrets. The local `.env.video-clip` file is ignored by git.

Required local runtime flags:

```bash
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
NODE_FUNCTION_ALLOW_BUILTIN=fs,child_process,url
```

Required LLM variables. The URL defaults to the Ark chat-completions endpoint when omitted, but keeping it in `.env.video-clip` makes the runtime explicit:

```bash
DOUBAO_LLM_URL=https://ark.cn-beijing.volces.com/api/v3/chat/completions
DOUBAO_LLM_API_KEY=
DOUBAO_LLM_MODEL=
DOUBAO_LLM_TEMPERATURE=0.7
```

Existing Ark-style names are also accepted: `ARK_API_KEY`, `ARK_API_BASE_URL`, and `ARK_MODEL_NAME`. When `ARK_API_BASE_URL` is a base URL such as `https://ark.cn-beijing.volces.com/api/v3`, the workflow appends `/chat/completions` automatically. When it ends with `/responses`, the workflow uses the Ark Responses API request shape instead.

Required TTS variables:

```bash
DOUBAO_TTS_URL=
DOUBAO_TTS_API_KEY=
DOUBAO_TTS_APP_ID=
DOUBAO_TTS_CLUSTER=volcano_tts
DOUBAO_TTS_RESOURCE_ID=seed-tts-2.0
```

`DOUBAO_TTS_V2_RESOURCE_ID` is also accepted as a compatibility alias for existing local env files.

## Import

Start n8n from the repository root with the local env file:

```bash
scripts/start-video-clip-n8n.sh
```

Then open `http://localhost:5678` and import `workflows/video-clip-tts-workflow.json`.

## Inputs

The n8n form accepts:

- `cover_image`: `png`, `jpg`, `jpeg`, or `webp`
- `proof_screenshot`: `png`, `jpg`, `jpeg`, or `webp`
- `background_video`: `mp4`, `mov`, or `webm`
- `viewpoint`: the user's opinion or angle
- `script_mode`: `single` or `dialogue`
- `voice_single`: narration voice preset
- `voice_a`: dialogue role A voice preset
- `voice_b`: dialogue role B voice preset
- `script_style`: short-video script style

The exposed voice fields are restricted to common official Doubao/Volcengine presets to avoid free-form speaker-id mistakes:

| Preset | Speaker ID | Use |
| --- | --- | --- |
| 灿灿 2.0 | `BV700_V2_streaming` | Default single narration |
| 擎苍 2.0 | `BV701_V2_streaming` | Dialogue role A / narrator |
| 通用女声 2.0 | `BV001_V2_streaming` | Dialogue role B |
| 灿灿 | `BV700_streaming` | Legacy general voice |
| 擎苍 | `BV701_streaming` | Legacy narrator voice |
| 通用男声 | `BV002_streaming` | Legacy male voice |

## Processing Flow

1. Save uploaded cover, screenshot, and background video under `/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/inputs/`.
2. Send the viewpoint, script mode, and style to Doubao/Volcengine LLM with `tools/video-composer/script-writer/SKILL.md`.
3. Parse strict JSON script output and write both `generated-script.json` and `script.txt`.
4. Generate TTS per segment. Single narration becomes one audio segment. Dialogue mode generates one segment per role turn with the selected role voice.
5. Merge all TTS segment audio into one `tts/audio.mp3`, inserting a short pause between dialogue turns.
6. Merge segment timing metadata into one `tts/timing.json`.
7. Render the final 16:9 MP4 with FFmpeg.

## Output Layout

- `0s - 3s`: background video plays, cover image is centered.
- `3s - 7s`: background video continues, proof screenshot is centered.
- `7s - end`: background video continues, cover image is placed top-left and screenshot top-right with light blur/softening.
- TTS audio and white transparent subtitles start from the beginning of the video.
- Final video duration follows the complete merged TTS audio duration.

The final MP4 and FFmpeg log are written under `/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/render/`.

## Result

The response includes the generated script metadata, local file paths, and binary previews for `ttsAudio` and `finalVideo` in the n8n execution view.

```json
{
  "ok": true,
  "jobId": "20260528-101530-a8f42c",
  "videoPath": "/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/20260528-101530-a8f42c/render/final.mp4",
  "audioPath": "/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/20260528-101530-a8f42c/tts/audio.mp3",
  "generatedScriptTitle": "标题",
  "generatedScriptText": "完整脚本文本"
}
```

## Troubleshooting

If a Code node fails with a built-in module or env access error, confirm `.env.video-clip` contains:

```bash
NODE_FUNCTION_ALLOW_BUILTIN=fs,child_process,url
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

If script generation fails, inspect:

```text
/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/inputs/script-prompt.txt
/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/inputs/script-response.json
```

If TTS fails, inspect:

```text
/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/tts/
/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/tts/timing.json
```

If video rendering fails, inspect:

```text
/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/job.json
/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/render/ffmpeg.log
```

Re-run the composer directly:

```bash
node tools/video-composer/compose-video.mjs /Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/job.json
```

## Local Tests

```bash
node --test tools/video-composer/workflow-utils.test.mjs
node --test tools/video-composer/compose-video.test.mjs
RUN_VIDEO_COMPOSER_SMOKE=1 node --test tools/video-composer/compose-video.test.mjs
```
