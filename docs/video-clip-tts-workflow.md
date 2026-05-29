# TTS Video Clip Composer Workflow

This workflow is an automated video editing workflow for n8n. It is not an AI video generation workflow. The final visual content comes from uploaded files: cover image, proof screenshot, and background video. The AI step only expands the user's viewpoint into a TTS script.

## Files

- Workflow import file: `workflows/video-clip-tts-workflow.json`
- Script writer prompt: `tools/video-composer/script-writer/SKILL.md`
- Workflow utilities: `tools/video-composer/workflow-utils.mjs`
- Composer script: `tools/video-composer/compose-video.mjs`
- Default job output: `/Users/stephenqiu/Desktop/Repository/n8n/tmp/n8n-video-jobs/{jobId}/`

## AI Podcast Sibling Workflow

The stable workflow remains `workflows/video-clip-tts-workflow.json`.

The AI podcast version is `workflows/video-clip-ai-podcast-workflow.json`. It uses the Volcengine speech console service `10028` with AppID `2152902662` through `DOUBAO_AI_PODCAST_*` env vars. Live validation for this AppID uses WebSocket resource `volc.service_type.10050`. It keeps the same cover, screenshot, background video, and composer behavior, but replaces segmented TTS with AI podcast audio.

For the new console, fill `DOUBAO_AI_PODCAST_API_KEY`. If the podcast WebSocket endpoint returns `401`, use the old-console compatibility fields as shown in Volcengine's podcast documentation: `DOUBAO_AI_PODCAST_APP_ID`, `DOUBAO_AI_PODCAST_ACCESS_KEY`, and, when shown by the console, `DOUBAO_AI_PODCAST_APP_KEY`.

The AI podcast workflow prefers native timestamps from the service. If the service does not return usable timing, `VIDEO_CLIP_SUBTITLE_FALLBACK=estimated` creates a duration-based subtitle timeline from the generated podcast prompt so the MVP can still render a video. Set `VIDEO_CLIP_SUBTITLE_FALLBACK=none` when you want strict native timestamps only.

Each AI podcast run also writes `tts/cost.json` and returns `cost` plus `costPath` in the workflow response. The cost estimate sums every `usage.total_tokens` frame returned by the podcast service and multiplies it by `DOUBAO_AI_PODCAST_PRICE_PER_MILLION_TOKENS`. The default value is `70`, matching the 10亿 token resource package baseline of 70000元.

The workflow response includes `reviewDir`, which points to the project-local `tmp/n8n-video-jobs/{jobId}` folder. Use this folder to inspect the final video, generated audio, subtitle ASS file, subtitle timing JSON, spoken transcript, cost estimate, metadata, and FFmpeg log.

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
NODE_FUNCTION_ALLOW_BUILTIN=fs,child_process
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
DOUBAO_TTS_CLONE_RESOURCE_ID=
```

`DOUBAO_TTS_V2_RESOURCE_ID` is also accepted as a compatibility alias for existing local env files. Official `*_V2_streaming` voice presets use `seed-tts-2.0` explicitly so older local resource-id values do not override the required resource.
Voice-clone presets whose speaker ID starts with `S_` require `DOUBAO_TTS_CLONE_RESOURCE_ID`; if it is empty, the workflow stops with a clear configuration error instead of sending the request with the wrong resource ID.

## Import

Start n8n from the repository root. The CLI automatically loads `.env.video-clip`
before n8n initializes, so Code nodes can read the required `$env` values:

```bash
pnpm start
```

The helper script is still available when you want it to fail fast if the local
env file is missing:

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
- `script_style`: script style, defaulting to `podcast_interview`

Dialogue mode generates a host/guest podcast-style script. The first host turn should open like a podcast with a topic setup, listener pain, concrete scene, or light counterintuitive hook. It is not forced to use one fixed opening sentence.

The exposed voice fields are restricted to the MVP podcast voice set verified against the local `DOUBAO_TTS_V2_RESOURCE_ID=seed-tts-2.0` configuration:

| Display name | Internal key | Speaker ID | Use |
| --- | --- | --- | --- |
| 男主持 - 温柔阿虎 | `host_male_wennuanahu` | `zh_male_wennuanahu_uranus_bigtts` | Default host |
| 男主持 - 刘飞 | `host_male_liufei` | `zh_male_liufei_uranus_bigtts` | Mature male host |
| 男主持 - 渊博小叔 | `host_male_yuanboxiaoshu` | `zh_male_yuanboxiaoshu_uranus_bigtts` | Knowledgeable male host |
| 女主持 - Tina 老师 | `host_female_tina` | `zh_female_yingyujiaoxue_uranus_bigtts` | Female host |
| 复刻音色 - S_H3coZls22 | `clone_voice_s_h3cozls22` | `S_H3coZls22` | Voice clone; requires `DOUBAO_TTS_CLONE_RESOURCE_ID` |
| 女嘉宾 - 小何 | `guest_female_xiaohe` | `zh_female_xiaohe_uranus_bigtts` | Default guest |
| 女嘉宾 - Tina 老师 | `guest_female_tina` | `zh_female_yingyujiaoxue_uranus_bigtts` | Female guest |
| 男嘉宾 - 刘飞 | `guest_male_liufei` | `zh_male_liufei_uranus_bigtts` | Male guest |
| 男嘉宾 - 渊博小叔 | `guest_male_yuanboxiaoshu` | `zh_male_yuanboxiaoshu_uranus_bigtts` | Male guest |

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
- `7s - end`: background video continues, cover image is placed top-left and screenshot top-right as clear semi-transparent overlays.
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
NODE_FUNCTION_ALLOW_BUILTIN=fs,child_process
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
