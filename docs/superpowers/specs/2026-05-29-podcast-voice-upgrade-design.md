# Podcast Interview Script And Voice Upgrade Design

## Goal

Upgrade the existing n8n video clip workflow so generated dialogue videos sound more like a real podcast-style interview instead of two voices reading a script.

The MVP remains the current video editing workflow:

- Users upload a cover image, proof screenshot, and background video.
- Users enter a viewpoint.
- The workflow generates a TTS script, synthesizes TTS audio, creates subtitles, and renders the final edited video.
- The workflow does not generate AI video.

This upgrade only changes script generation and selectable voice presets.

## Current Context

The existing workflow already supports:

- Single narration mode.
- Two-person dialogue mode.
- Doubao/Volcengine LLM script generation.
- Doubao TTS through `seed-tts-2.0`.
- Per-segment TTS generation for dialogue mode.
- Audio merge, subtitle generation, and final FFmpeg composition.

The current script writer is still short-video-commentary oriented. Dialogue mode alternates A/B turns, but the result can feel like two people reading prepared lines instead of a host and guest having a conversation.

The current voice list includes some voices that are technically valid but not ideal for mature podcast content, such as cute or youthful character voices.

## Voice Probe Result

The current local `.env.video-clip` credentials and `seed-tts-2.0` resource were tested with short TTS requests.

Confirmed usable for the current API key and resource:

| Speaker | Suggested label | Use |
| --- | --- | --- |
| `zh_male_wennuanahu_uranus_bigtts` | 温柔阿虎 | Default warm mature male host |
| `zh_male_m191_uranus_bigtts` | 云舟 | Mature male host backup |
| `zh_male_liufei_uranus_bigtts` | 刘飞 | Mature male guest or host |
| `zh_male_sophie_uranus_bigtts` | 魅力苏菲 | Mature/general male host |
| `zh_male_dayi_uranus_bigtts` | 大壹 | Video narration male backup |
| `zh_female_xiaohe_uranus_bigtts` | 小何 | Default mature female guest |
| `zh_female_vv_uranus_bigtts` | Vivi | Mature/general female host or guest |
| `zh_female_shuangkuaisisi_uranus_bigtts` | 爽快思思 | Energetic female backup |
| `zh_female_cancan_uranus_bigtts` | 知性灿灿 | Knowledgeable female backup |
| `zh_female_kefunvsheng_uranus_bigtts` | 暖阳女声 | Warm female backup |

Confirmed usable but not recommended as mature podcast defaults:

| Speaker | Reason |
| --- | --- |
| `zh_male_taocheng_uranus_bigtts` | Younger male tone |
| `zh_male_sunwukong_uranus_bigtts` | Character-like |
| `zh_female_tianmeixiaoyuan_uranus_bigtts` | Sweet/young tone |
| `zh_female_xiaoxue_uranus_bigtts` | Story/younger tone |
| `saturn_zh_female_keainvsheng_tob` | Cute character tone |
| `saturn_zh_male_shuanglangshaonian_tob` | Youthful character tone |

Confirmed not usable with the current `seed-tts-2.0` resource:

| Speaker |
| --- |
| `BV100_streaming` |
| `BV001_streaming` |
| `BV002_streaming` |
| `BV700_V2_streaming` |

The workflow must not add `BV*_streaming` speakers to the default 2.0 voice dropdowns.

## Script Design

Dialogue mode becomes a podcast interview format:

- Role `A` means `Host`.
- Role `B` means `Guest`.
- The JSON schema remains unchanged so downstream nodes do not need a structural rewrite.
- The first host segment must be a podcast-style opening that quickly gives listeners a reason to keep listening. It should not be locked to one fixed sentence.
- Valid opening patterns include topic setup, listener pain, a concrete scene, or a mild counterintuitive hook. Phrases such as `今天咱们来聊...` are allowed, but not required.
- The script writer should adapt the style of `/Users/stephenqiu/Desktop/Repository/ShotFlow/workspace/workspace-planF-canvas/skills/opinion-to-podcast-script/SKILL.md` without changing the existing workflow JSON shape. In practice, it should internally transform `viewpoint -> thesis -> audience pain -> argument map -> objection -> takeaway`.
- The conversation should include a clear arc:
  1. Host opens with a podcast-style hook or topic setup.
  2. Host states the core claim in one clear thesis.
  3. Guest reacts as a listener proxy and confirms why the topic matters.
  4. Host and guest expand 2-3 argument points with examples or analogies.
  5. Guest raises at least one concrete objection or listener concern.
  6. Host acknowledges the reasonable part of the objection and explains the boundary.
  7. Host or guest closes with a concise takeaway.

Dialogue constraints:

- Prefer 8-12 segments.
- Each segment should be 30-90 Chinese characters.
- Avoid stage directions, sound effects, bracketed actions, and role descriptions inside spoken text.
- Avoid over-polished essay language.
- Use natural host/guest phrasing, but keep the text clean enough for TTS and subtitles.
- The host should guide the structure and ask follow-up questions.
- The guest should work as a listener proxy: confirming value, asking for examples, raising practical concerns, and adding grounded reactions.
- No role should speak more than two consecutive turns.

Single narration mode can remain available, but this upgrade focuses on dialogue mode.

## Voice Design

The form voice dropdowns should use podcast-oriented labels and mature speaker presets.

Recommended host voices:

| Key | Speaker | Label |
| --- | --- | --- |
| `host_male_wennuanahu` | `zh_male_wennuanahu_uranus_bigtts` | 男主持 - 温柔阿虎 |
| `host_male_yunzhou` | `zh_male_m191_uranus_bigtts` | 男主持 - 云舟 |
| `host_male_liufei` | `zh_male_liufei_uranus_bigtts` | 男主持 - 刘飞 |
| `host_male_sophie` | `zh_male_sophie_uranus_bigtts` | 男主持 - 魅力苏菲 |
| `host_female_vivi` | `zh_female_vv_uranus_bigtts` | 女主持 - Vivi |

Recommended guest voices:

| Key | Speaker | Label |
| --- | --- | --- |
| `guest_female_xiaohe` | `zh_female_xiaohe_uranus_bigtts` | 女嘉宾 - 小何 |
| `guest_female_vivi` | `zh_female_vv_uranus_bigtts` | 女嘉宾 - Vivi |
| `guest_female_cancan` | `zh_female_cancan_uranus_bigtts` | 女嘉宾 - 知性灿灿 |
| `guest_male_liufei` | `zh_male_liufei_uranus_bigtts` | 男嘉宾 - 刘飞 |
| `guest_male_dayi` | `zh_male_dayi_uranus_bigtts` | 男嘉宾 - 大壹 |

Backup expressive voices:

| Key | Speaker | Label |
| --- | --- | --- |
| `female_shuangkuaisisi` | `zh_female_shuangkuaisisi_uranus_bigtts` | 女声 - 爽快思思 |
| `female_kefunvsheng` | `zh_female_kefunvsheng_uranus_bigtts` | 女声 - 暖阳女声 |

Defaults:

- `voice_a`: `host_male_wennuanahu`
- `voice_b`: `guest_female_xiaohe`
- `voice_single`: `host_male_wennuanahu` or `guest_female_xiaohe`; the implementation can choose one, but it must be a mature verified voice.

The previous cute/youthful voices should not be default options for the podcast flow.

## Workflow Changes

The workflow should update:

- The form dropdown values for `voice_single`, `voice_a`, and `voice_b`.
- The `VOICE_PRESETS` object in `tools/video-composer/workflow-utils.mjs`.
- The inlined `VOICE_PRESETS` copies inside workflow Code nodes.
- Tests that assert voice preset behavior.
- Documentation that lists supported local voice choices.

The workflow should not add voice cloning yet.

## Error Handling

If TTS returns a resource mismatch or no audio for a selected voice, the workflow should produce a readable error that tells the user:

- The selected voice is not available for the current `seed-tts-2.0` resource or account.
- Switch back to a recommended verified voice such as `host_male_wennuanahu` or `guest_female_xiaohe`.

## Testing

Static checks:

- `node --test tools/video-composer/workflow-utils.test.mjs`
- Parse `workflows/video-clip-tts-workflow.json`.
- Parse all n8n Code node JavaScript with `AsyncFunction`.
- `git diff --check` on touched files.

Runtime acceptance:

- Run one dialogue-mode form submission using the new default host and guest voices.
- Confirm execution succeeds.
- Confirm generated script starts with a natural podcast-style opening, not a rigid template sentence.
- Confirm generated TTS has multiple A/B segment MP3 files.
- Confirm final video duration matches merged TTS duration.
- Confirm final video contains white subtitles and the existing three-stage visual layout.

## Out Of Scope

- Voice cloning / voice replication.
- Automatic voice catalog discovery.
- User-uploaded speaker samples.
- Changing the final video layout.
- Replacing Doubao TTS with another provider.
