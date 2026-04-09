## Use Cases

> This task takes `audio` and a `text prompt` and returns `text` (answers, summaries, structured notes, etc.).

### Audio question answering

Ask targeted questions about lectures, podcasts, or calls and get context-aware answers.
**Example:** Audio: physics lecture → Prompt: “What did the teacher say about gravity and how is it measured?”

### Meeting notes & action items

Turn multi-speaker meetings into concise minutes with decisions, owners, and deadlines.
**Example:** Audio: weekly stand-up → Prompt: “Summarize key decisions and list action items with assignees.”

### Speech understanding & intent

Go beyond transcription to extract intent, sentiment, uncertainty, or emotion from spoken language.
**Example:** “I’m not sure I can finish this on time.” → Prompt: “Describe speaker intent and confidence.”

### Music & sound analysis (textual)

Describe instrumentation, genre, tempo, or sections, and suggest edits or techniques (text output only).
**Example:** Song demo → Prompt: “Identify key and tempo, then suggest jazz reharmonization ideas for the chorus.”

## Inference

You can use the 'transformers' library, and your audio file to any of the `audio-text-to-text` model, with instructions and get text responses. Following code examples show how to do so.

### Speech Transcription and Analysis

These models don’t just turn speech into text—they also capture tone, emotion, and speaker traits. This makes them useful for tasks like sentiment analysis or identifying speaker profiles.

You can try audio transcription with [Voxtral Mini](https://huggingface.co/mistralai/Voxtral-Mini-3B-2507) using the following code.

```python
from transformers import VoxtralForConditionalGeneration, AutoProcessor
import torch

device = "cuda"
repo_id = "mistralai/Voxtral-Mini-3B-2507"

processor = AutoProcessor.from_pretrained(repo_id)
model = VoxtralForConditionalGeneration.from_pretrained(repo_id, dtype=torch.bfloat16, device_map=device)

inputs = processor.apply_transcription_request(language="en", audio="https://huggingface.co/datasets/hf-internal-testing/dummy-audio-samples/resolve/main/obama.mp3", model_id=repo_id)
inputs = inputs.to(device, dtype=torch.bfloat16)

outputs = model.generate(**inputs, max_new_tokens=500)
decoded_outputs = processor.batch_decode(outputs[:, inputs.input_ids.shape[1]:], skip_special_tokens=True)

print("\nGenerated responses:")
print("=" * 80)
for decoded_output in decoded_outputs:
    print(decoded_output)
    print("=" * 80)
```

### Audio Question Answering

These models can understand audio directly and answer questions about it. For example, summarizing a podcast clip or explaining parts of a recorded conversation.

You can experiment with [Qwen2-Audio-Instruct-Demo](https://huggingface.co/Qwen/Qwen2-Audio-Instruct-Demo) for conversations with both text and audio inputs, letting you ask follow-up questions about different sounds or speech clips.

```python
from io import BytesIO
from urllib.request import urlopen
import librosa
from transformers import Qwen2AudioForConditionalGeneration, AutoProcessor

processor = AutoProcessor.from_pretrained("Qwen/Qwen2-Audio-7B-Instruct")
model = Qwen2AudioForConditionalGeneration.from_pretrained("Qwen/Qwen2-Audio-7B-Instruct", device_map="auto")

conversation = [
    {'role': 'system', 'content': 'You are a helpful assistant.'},
    {"role": "user", "content": [
        {"type": "audio", "audio_url": "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen2-Audio/audio/glass-breaking-151256.mp3"},
        {"type": "text", "text": "What's that sound?"},
    ]},
    {"role": "assistant", "content": "It is the sound of glass shattering."},
    {"role": "user", "content": [
        {"type": "text", "text": "What can you do when you hear that?"},
    ]},
    {"role": "assistant", "content": "Stay alert and cautious, and check if anyone is hurt or if there is any damage to property."},
    {"role": "user", "content": [
        {"type": "audio", "audio_url": "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen2-Audio/audio/1272-128104-0000.flac"},
        {"type": "text", "text": "What does the person say?"},
    ]},
]
text = processor.apply_chat_template(conversation, add_generation_prompt=True, tokenize=False)
audios = []
for message in conversation:
    if isinstance(message["content"], list):
        for ele in message["content"]:
            if ele["type"] == "audio":
                audios.append(
                    librosa.load(
                        BytesIO(urlopen(ele['audio_url']).read()),
                        sr=processor.feature_extractor.sampling_rate)[0]
                )

inputs = processor(text=text, audios=audios, return_tensors="pt", padding=True)
inputs.input_ids = inputs.input_ids.to("cuda")

generate_ids = model.generate(**inputs, max_length=256)
generate_ids = generate_ids[:, inputs.input_ids.size(1):]

response = processor.batch_decode(generate_ids, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]
```

## Useful Resources

If you want to learn more about this concept, here are some useful links:

### Papers

- [SpeechGPT](https://huggingface.co/papers/2507.13264) — multimodal dialogue with speech and text.
- [Voxtral](https://huggingface.co/papers/2507.13264) — a state-of-the-art audio-text model.
- [Qwen2-audio-instruct](https://huggingface.co/papers/2407.10759) — large-scale audio-language modeling for instruction following.
- [AudioPaLM](https://huggingface.co/papers/2306.12925) — scaling audio-language models with PaLM.

### Models, Codes & Demos

- [Qwen2-audio-instruct](https://github.com/QwenLM/Qwen2-Audio) — open-source implementation with demos.
- [SpeechGPT](https://github.com/0nutation/SpeechGPT) — An end-to-end framework for audio conversational models built on top of large language models.
- [AudioPaLM](https://google-research.github.io/seanet/audiopalm/examples/) — resources and code for AudioPaLM.
- [Audio Flamingo](https://huggingface.co/nvidia/audio-flamingo-3) — unifies speech, sound, and music understanding with long-context reasoning.
- [Ultravox](https://github.com/fixie-ai/ultravox) — a fast multimodal large language model designed for real-time voice interactions.
- [Ichigo](https://github.com/menloresearch/ichigo) — an audio-text-to-text model for audio-related tasks.

### Datasets

- [nvidia/AF-Think](https://huggingface.co/datasets/nvidia/AF-Think)
- [nvidia/AudioSkills](https://huggingface.co/datasets/nvidia/AudioSkills)

### Tools & Extras

- [Fast-RTC](https://huggingface.co/fastrtc) — turn any Python function into a real-time audio/video stream.
- [PhiCookBook](https://github.com/microsoft/PhiCookBook) — Microsoft’s open-source guide to small language models.
- [Qwen2-audio-instruct](https://qwenlm.github.io/blog/qwen2-audio/) — Blogpost explaining usage and demos of Qwen2-audio-instruct.
