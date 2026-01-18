const wf = workflow('CXHBDt6tSiHrMyZj', '🎬 AI YouTube Video Generator - One-Click Automation', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-1640, -180], name: 'When clicking ‘Execute workflow’' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					modelId: { __rl: true, mode: 'id', value: '=o3-mini-2025-01-31' },
					options: {},
					messages: {
						values: [
							{
								role: 'system',
								content:
									'you create video concepts based on the user query.\n\nYou output the following in JSON:\n{\n  "Script": {\n    "Intro": "40-70 characters",\n    "Base": "280-350 characters",\n    "CTA": "≈50 characters"\n  },\n  "Title": "30-50 characters (short, engaging, curiosity-driven e.g. “I tried THIS for 7 days… Crazy results!”)",\n  "Description": "50-150 characters (punchy hook, add context, CTA, #hashtags)"\n}\n\n}',
							},
							{
								content:
									'<user-query>\nGive me top 5 interesting facts about plastic \n</user-query>',
							},
						],
					},
					jsonOutput: true,
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [-1420, -180],
				name: 'Ideator 🧠',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: 'd8012b83-168e-4de8-9d4a-dc91e24d9964',
								name: 'Script',
								type: 'string',
								value:
									'=  {{ $json.message.content.Script.Intro }} {{ $json.message.content.Script.Base }} {{ $json.message.content.Script.CTA }}',
							},
						],
					},
				},
				position: [-1200, -180],
				name: 'Script',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.elevenlabs.io/v1/text-to-speech/2qfp6zPuviqeCOZIE9RZ/with-timestamps?output_format=mp3_44100_128',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{ name: 'text', value: '={{ $json.Script }}' },
							{ name: 'output_format', value: 'mp3_44100_128' },
							{ name: 'model_id', value: 'eleven_multilingual_v2' },
						],
					},
					genericAuthType: 'httpHeaderAuth',
					headerParameters: { parameters: [{}] },
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-980, -180],
				name: 'Script Generator',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://prod.0codekit.com/code/python',
					method: 'POST',
					options: { redirect: { redirect: {} } },
					sendBody: true,
					sendHeaders: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'code',
								value:
									'=# -*- coding: utf-8 -*-\n"""\nn8n  ▸  “Execute Python” (or “Run Python”) node\nPurpose: slice an ElevenLabs alignment object into fixed-length\n         caption / transcript chunks and return them as JSON.\n\nInput  (item JSON) must contain:\n  ├─ audio_base64            – MP3/WAV in base-64 (not used here but kept in case you want it)\n  ├─ alignment               – full alignment object from ElevenLabs\n  └─ normalized_alignment    – (optional) same structure but already normalised\n\nOutput:\n  {\n    "data": [\n      { "words": "Hello world", "id": 1, "duration": 3.98 },\n      { "words": "… next chunk …", "id": 2, "duration": 4.0 },\n      …\n    ]\n  }\n"""\nimport json\nfrom typing import List, Dict, Union\n\n# Extract data from N8N context\naudio_base64 = "{{ $json.audio_base64 }}"\nalignment_str = r\'\'\'{{ JSON.stringify($json.alignment).replace(/\\u2014/g, \'-\') }}\'\'\'\nnormalized_alignment_str = r\'\'\'{{ JSON.stringify($json.normalized_alignment).replace(/\\u2014/g, \'-\') }}\'\'\'\n\ndef sanitize_unicode(text: str) -> str:\n    """Remove problematic Unicode characters that could break JSON parsing."""\n    return text.encode("ascii", "ignore").decode("ascii")\n\ndef parse_alignment_data(alignment_str: str, normalized_str: str) -> tuple:\n    """Parse and sanitize alignment JSON strings."""\n    clean_alignment = sanitize_unicode(alignment_str)\n    clean_normalized = sanitize_unicode(normalized_str)\n    \n    alignment = json.loads(clean_alignment or "{}")\n    normalized_alignment = json.loads(clean_normalized or "{}")\n    \n    return alignment, normalized_alignment\n\n# Parse alignment data\nalignment, normalized_alignment = parse_alignment_data(alignment_str, normalized_alignment_str)\n\n# ────────────────────────────────────────────────────────────────────────────\n# 4.  Helper: split the aligned characters into 6-second (default) windows\n# ────────────────────────────────────────────────────────────────────────────\ndef create_audio_segments(alignment: Dict, segment_duration: float = 4.0) -> List[Dict[str, Union[str, int, float]]]:\n    """\n    Split aligned audio data into fixed-duration segments optimized for video generation.\n    \n    Args:\n        alignment: Dictionary containing characters and timing data from ElevenLabs\n        segment_duration: Target duration for each segment in seconds (default: 4.0)\n        \n    Returns:\n        List of segment dictionaries with words, id, and precise duration\n    """\n    chars = alignment.get("characters", [])\n    start_times = [float(t) for t in alignment.get("character_start_times_seconds", [])]\n    end_times = [float(t) for t in alignment.get("character_end_times_seconds", [])]\n    \n    # Validate input data\n    if not chars or not start_times or not end_times:\n        return []\n    \n    total_duration = end_times[-1] if end_times else 0\n    segments = []\n    \n    # Handle short audio that fits in one segment\n    if 0 < total_duration <= segment_duration:\n        return [{\n            "words": "".join(chars).strip(),\n            "id": 1,\n            "duration": round(total_duration, 2)\n        }]\n    \n    # Create time-based segments with improved character distribution\n    current_time = 0.0\n    segment_id = 1\n    \n    while current_time < total_duration:\n        segment_end = min(current_time + segment_duration, total_duration)\n        \n        # Extract characters within this time window\n        segment_chars = [\n            char for char, start_time in zip(chars, start_times)\n            if current_time <= start_time < segment_end\n        ]\n        \n        # Only add non-empty segments with meaningful content\n        if segment_chars:\n            segment_text = "".join(segment_chars).strip()\n            if segment_text:  # Ensure we don\'t add empty segments\n                segments.append({\n                    "words": segment_text,\n                    "id": segment_id,\n                    "duration": round(segment_end - current_time, 2)\n                })\n                segment_id += 1\n        \n        current_time = segment_end\n    \n    return segments\n\n# ────────────────────────────────────────────────────────────────────────────\n# 5.  Run it & hand the result back to n8n\n# ────────────────────────────────────────────────────────────────────────────\ntry:\n    segments = create_audio_segments(alignment, segment_duration=4.0)\n    result = {"data": segments}\nexcept Exception as e:\n    # makes debugging in n8n easier\n    result = {"data": {"error": "Processing failed", "details": str(e)}}\n\n# n8n expects the Python node to expose a variable named “result”\n# (one per incoming item) – that’s exactly what we return above.\n',
							},
						],
					},
					genericAuthType: 'httpHeaderAuth',
					headerParameters: { parameters: [{}] },
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-760, -180],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: {
					include: 'allOtherFields',
					options: {},
					fieldToSplitOut: 'result.data',
				},
				position: [-540, -180],
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					modelId: { __rl: true, mode: 'id', value: 'o3-mini-2025-01-31' },
					options: {},
					messages: {
						values: [
							{
								role: 'system',
								content:
									'You are an image-prompt generator agent for video production.\nYour job is to turn each script segment into a concise, visually descriptive prompt that will serve as the opening frame of a longer video.\n\nReturn a JSON object for the current script segment only:\n\n{\n  "Prompt": "enter prompt here"\n}\nYour prompt must depict the first frame of the 4-second scene and set the overall visual tone for that shot.\n\nIMPORTANT INSTRUCTIONS\n\nNever include text in the image; on-screen words cannot be animated later.\nKeep the prompt under 240 characters.\n\nMake the image concept extremely simple. The video-generation model struggles with people, complex motion, and busy scenes, but it excels at landscapes, POV shots, and close-ups.',
							},
							{
								content:
									"=Here's the full script:\n{{ $('Script').item.json.Script }}\n\nHere's the current scene:\nscript portion: {{ $json['result.data'].words }}\nscript position: {{ $json['result.data'].id }}",
							},
						],
					},
					jsonOutput: true,
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [-320, -180],
				name: 'image-prompter',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://cloud.leonardo.ai/api/rest/v1/generations',
					method: 'POST',
					options: {},
					jsonBody:
						'={ "prompt":"{{ $json.message.content.Prompt }}",\n  "modelId":"6bef9f1b-29cb-40c7-b9df-32b51c1f67d3",\n  "width":832, "height":480, "num_images":1 }\n',
					sendBody: true,
					contentType: '=json',
					sendHeaders: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					bodyParameters: { parameters: [{}] },
					genericAuthType: 'httpHeaderAuth',
					headerParameters: {
						parameters: [{ name: 'Content-Type', value: 'application/json' }],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [40, -180],
				name: 'request image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { unit: 'minutes', amount: 1 }, position: [260, -180], name: 'Wait2' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ \n  'https://cloud.leonardo.ai/api/rest/v1/generations/' + \n  ($json.sdGenerationJob?.generationId || $json.generationId || $json.sdGenerationId)\n}}",
					options: { response: { response: { fullResponse: true } } },
					sendHeaders: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [480, -180],
				name: 'request image1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { unit: 'minutes', amount: 1 }, position: [660, -180], name: 'Wait3' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://cloud.leonardo.ai/api/rest/v1/generations-motion-svd',
					method: 'POST',
					options: { response: { response: { fullResponse: true } } },
					sendBody: true,
					contentType: '=json',
					sendHeaders: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: '=imageId',
								value: '={{$json.body.generations_by_pk.generated_images[0].id}}',
							},
							{ name: '=motionStrength', value: '={{ 2 }}' },
						],
					},
					genericAuthType: 'httpHeaderAuth',
					headerParameters: {
						parameters: [{ name: 'Content-Type', value: 'application/json' }],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [860, -180],
				name: 'request image2',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { unit: 'minutes', amount: 2 }, position: [1080, -180], name: 'Wait4' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://cloud.leonardo.ai/api/rest/v1/generations/{{ $json.body.motionSvdGenerationJob.generationId }}',
					options: { response: { response: { fullResponse: true } } },
					sendHeaders: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [1320, -180],
				name: 'Request Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { unit: 'minutes', amount: 1 }, position: [1540, -180], name: 'Wait1' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: '7858977a-d50a-4fad-b0cc-ef787a697f1f',
								name: 'output',
								type: 'string',
								value: '={{ $json.body.generations_by_pk.generated_images[0].motionMP4URL }}',
							},
						],
					},
				},
				position: [1780, -180],
				name: 'Edit Fields',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: {
					include: 'specifiedFields',
					options: {},
					aggregate: 'aggregateAllItemData',
					fieldsToInclude: '=output',
					destinationFieldName: 'Videos',
				},
				position: [2060, -180],
			},
		}),
	)
	.then(
		merge(
			[
				node({
					type: 'n8n-nodes-base.aggregate',
					version: 1,
					config: {
						parameters: {
							include: 'specifiedFields',
							options: {},
							aggregate: 'aggregateAllItemData',
							fieldsToInclude: '=output',
							destinationFieldName: 'Videos',
						},
						position: [2060, -180],
					},
				}),
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: {
							url: '=https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/raw/upload',
							method: 'POST',
							options: {},
							sendBody: true,
							contentType: 'form-urlencoded',
							bodyParameters: {
								parameters: [
									{
										name: 'file',
										value: '=data:audio/mp3;base64,{{ $json.audio_base64 }}',
									},
									{ name: 'upload_preset', value: 'default' },
								],
							},
						},
						position: [-780, 220],
						name: 'Upload Cloudinary',
					},
				}),
			],
			{
				version: 3.2,
				parameters: {
					mode: 'combine',
					options: { includeUnpaired: true },
					combineBy: 'combineByPosition',
				},
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://prod.0codekit.com/code/python',
					method: 'POST',
					options: { redirect: { redirect: {} } },
					sendBody: true,
					sendHeaders: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'code',
								value:
									'=#!/usr/bin/env python3\n"""\nOptimized Video Render JSON Generator for N8N\nCreates Creatomate-compatible render configuration with enhanced video composition\n\nInput: Video segments and audio URL\nOutput: Creatomate render JSON with optimized transitions and timing\n"""\nimport json\nfrom typing import List, Dict, Union, Any\n\ndef create_video_element(video: Dict, start_time: float, crossfade_duration: float = 0.3) -> Dict[str, Any]:\n    """\n    Create a single video element with optimized animations.\n    \n    Args:\n        video: Video segment data with \'output\' URL and \'duration\'\n        start_time: Start time for this video segment\n        crossfade_duration: Duration of crossfade transition\n        \n    Returns:\n        Formatted video element for Creatomate\n    """\n    duration = video.get("duration", 4.0)\n    \n    return {\n        "type": "video",\n        "source": video["output"],\n        "duration": duration,\n        "time": start_time,\n        "track": 1,\n        "animations": [{\n            "type": "fade",\n            "duration": crossfade_duration,\n            "direction": "both",\n            "transition": True\n        }]\n    }\n\ndef build_optimized_render_json(videos: List[Dict], audio_url: str, crossfade_duration: float = 0.3) -> Dict[str, Any]:\n    """\n    Build optimized render JSON for Creatomate with enhanced video composition.\n    \n    Args:\n        videos: List of video segments with URLs and durations\n        audio_url: Background audio URL\n        crossfade_duration: Duration of crossfade transitions between videos\n        \n    Returns:\n        Complete render configuration for Creatomate API\n    """\n    elements = []\n    timeline_position = 0.0\n    \n    # Add background audio track (spans entire video duration)\n    elements.append({\n        "type": "audio",\n        "source": audio_url,\n        "track": 0  # Audio on separate track\n    })\n    \n    # Add video segments with optimized transitions\n    for i, video in enumerate(videos):\n        if not video or "output" not in video:\n            continue  # Skip invalid video segments\n            \n        video_element = create_video_element(video, timeline_position, crossfade_duration)\n        elements.append(video_element)\n        \n        # Advance timeline by full duration (overlaps handled by crossfade)\n        timeline_position += video.get("duration", 4.0)\n    \n    # Return optimized render configuration\n    return {\n        "source": {\n            "output_format": "mp4",\n            "width": 1080,\n            "height": 1920,  # Vertical format for social media\n            "frame_rate": 30,  # Smooth playback\n            "elements": elements\n        }\n    }\n\ndef main() -> Dict[str, Any]:\n    """Main function with enhanced error handling and validation."""\n    try:\n        # Parse N8N input data\n        videos_json = \'{{ JSON.stringify($json.Videos) }}\'\n        audio_url = "{{ $json.secure_url }}"\n        \n        # Validate inputs\n        if not audio_url:\n            raise ValueError("Audio URL is required")\n            \n        videos = json.loads(videos_json) if videos_json else []\n        \n        if not videos:\n            raise ValueError("At least one video segment is required")\n        \n        # Generate optimized render configuration\n        render_config = build_optimized_render_json(videos, audio_url, crossfade_duration=0.3)\n        \n        return render_config\n        \n    except json.JSONDecodeError as e:\n        return {"error": "Invalid JSON in video data", "details": str(e)}\n    except ValueError as e:\n        return {"error": "Validation failed", "details": str(e)}\n    except Exception as e:\n        return {"error": "Render configuration failed", "details": str(e)}\n\n# Execute and return result for N8N\nresult = main()\n',
							},
						],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [2700, -100],
				name: 'Create editor JSON',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: '3028cff7-716e-4f7e-afed-fed7985751c6',
								name: 'Creatomate Request',
								type: 'object',
								value: '={{ $json.result.source }}',
							},
						],
					},
				},
				position: [2920, -100],
				name: 'SET JSON VARIABLE',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.creatomate.com/v1/renders',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'source',
								value: "={{ $json['Creatomate Request'] }}",
							},
						],
					},
					genericAuthType: 'httpHeaderAuth',
					headerParameters: {
						parameters: [{ name: 'Content-Type', value: 'application/json' }],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [3140, -100],
				name: 'Editor',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 70 }, position: [3360, -100], name: 'Rendering wait' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://api.creatomate.com/v1/renders/{{ $('Editor').item.json.id }}",
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [3560, -100],
				name: 'Get final video',
			},
		}),
	)
	.add(
		sticky(
			'## 🎬 AI YouTube Video Generator\n\n**One-Click Automation Workflow**\n\nThis workflow automatically creates complete YouTube videos from a simple text prompt using:\n\n• **OpenAI** - Content generation & image prompts\n• **ElevenLabs** - Text-to-speech conversion  \n• **Leonardo AI** - Image & video generation\n• **Creatomate** - Final video assembly\n• **Cloudinary** - Asset storage\n\n### 🚀 Setup Required:\n1. Configure API credentials for all services\n2. Set Cloudinary environment variable\n3. Customize voice ID in ElevenLabs node\n4. Test with simple prompts first\n\n**Input:** Text query about any topic\n**Output:** Complete YouTube video with audio + visuals',
			{ name: 'Main Info', position: [-2000, -400], width: 389, height: 464 },
		),
	)
	.add(
		sticky(
			'## 🧠 Content Generation\n\n**Step 1:** AI creates video concept\n\n• Generates structured script (Intro/Base/CTA)\n• Creates engaging title & description\n• Optimized for YouTube engagement\n• Uses latest OpenAI models\n\n**Input:** Your topic query\n**Output:** Complete video concept in JSON',
			{ name: 'Content Generation', position: [-1680, -450], width: 289, height: 242 },
		),
	)
	.add(
		sticky(
			'## 🎙️ Audio Processing\n\n**Step 2:** Convert text to speech\n\n• ElevenLabs high-quality TTS\n• Returns audio + timing alignment\n• Segments into 4-second chunks\n• Optimized for video sync\n\n**Input:** Generated script\n**Output:** Audio file + timing data',
			{ name: 'Audio Processing', position: [-1220, -450], width: 289, height: 242 },
		),
	)
	.add(
		sticky(
			'## 🎨 Visual Generation\n\n**Step 3:** Create video segments\n\n• AI generates image prompts for each segment\n• Leonardo AI creates high-quality images\n• Converts images to animated videos\n• Each segment matches audio timing\n\n**Process:** Image → Motion → Video\n**Output:** Individual video segments',
			{ name: 'Visual Generation', position: [-100, -450], width: 349, height: 242 },
		),
	)
	.add(
		sticky(
			'## 🎬 Final Assembly\n\n**Step 4:** Combine everything\n\n• Merges all video segments\n• Adds background audio track\n• Creates smooth transitions\n• Renders final MP4 video\n\n**Output:** Complete YouTube-ready video\n**Format:** 1080x1920 (vertical) MP4',
			{ name: 'Final Assembly', position: [2800, -450], width: 309, height: 242 },
		),
	)
	.add(
		sticky(
			'## ⚙️ Configuration Notes\n\n**Required Environment Variables:**\n• `CLOUDINARY_CLOUD_NAME`\n\n**API Credentials Needed:**\n• OpenAI API key\n• ElevenLabs API key  \n• Leonardo AI API key\n• Creatomate API key\n• Cloudinary credentials',
			{ name: 'Configuration', position: [-2000, 120], width: 309, height: 183 },
		),
	);
