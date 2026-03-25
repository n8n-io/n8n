## Use Cases

### Virtual Speech Assistants

Many edge devices have an embedded virtual assistant to interact with the end users better. These assistances rely on ASR models to recognize different voice commands to perform various tasks. For instance, you can ask your phone for dialing a phone number, ask a general question, or schedule a meeting.

### Caption Generation

A caption generation model takes audio as input from sources to generate automatic captions through transcription, for live-streamed or recorded videos. This can help with content accessibility. For example, an audience watching a video that includes a non-native language, can rely on captions to interpret the content. It can also help with information retention at online-classes environments improving knowledge assimilation while reading and taking notes faster.

## Task Variants

### Multilingual ASR

Multilingual ASR models can convert audio inputs with multiple languages into transcripts. Some multilingual ASR models include [language identification](https://huggingface.co/tasks/audio-classification) blocks to improve the performance.

The use of Multilingual ASR has become popular, the idea of maintaining just a single model for all language can simplify the production pipeline. Take a look at [Whisper](https://huggingface.co/openai/whisper-large-v2) to get an idea on how 100+ languages can be processed by a single model.

## Inference

The Hub contains over [17,000 ASR models](https://huggingface.co/models?pipeline_tag=automatic-speech-recognition&sort=downloads) that you can test right away in your browser using the model page widgets. You can also use any model as a service using the Serverless Inference API. We also support libraries such as [transformers](https://huggingface.co/models?library=transformers&pipeline_tag=automatic-speech-recognition&sort=downloads), [speechbrain](https://huggingface.co/models?library=speechbrain&pipeline_tag=automatic-speech-recognition&sort=downloads), [NeMo](https://huggingface.co/models?pipeline_tag=automatic-speech-recognition&library=nemo&sort=downloads) and [espnet](https://huggingface.co/models?library=espnet&pipeline_tag=automatic-speech-recognition&sort=downloads) via the Serverless Inference API. Here's a simple code snippet to run inference:

```python
import json
import requests

headers = {"Authorization": f"Bearer {API_TOKEN}"}
API_URL = "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3"

def query(filename):
    with open(filename, "rb") as f:
        data = f.read()
    response = requests.request("POST", API_URL, headers=headers, data=data)
    return json.loads(response.content.decode("utf-8"))

data = query("sample1.flac")
```

You can also use [huggingface.js](https://github.com/huggingface/huggingface.js), the JavaScript client, to transcribe audio with the Serverless Inference API.

```javascript
import { InferenceClient } from "@huggingface/inference";

const inference = new InferenceClient(HF_TOKEN);
await inference.automaticSpeechRecognition({
	data: await (await fetch("sample.flac")).blob(),
	model: "openai/whisper-large-v3",
});
```

For transformers-compatible models like Whisper, Wav2Vec2, and HuBERT, you can also run inference with the library as follows:

```python
# pip install --upgrade transformers

from transformers import pipeline

pipe = pipeline("automatic-speech-recognition", "openai/whisper-large-v3")

pipe("sample.flac")
# {'text': "GOING ALONG SLUSHY COUNTRY ROADS AND SPEAKING TO DAMP AUDIENCES IN DRAUGHTY SCHOOL ROOMS DAY AFTER DAY FOR A FORTNIGHT HE'LL HAVE TO PUT IN AN APPEARANCE AT SOME PLACE OF WORSHIP ON SUNDAY MORNING AND HE CAN COME TO US IMMEDIATELY AFTERWARDS"}
```

## Solving ASR for your own data

We have some great news! You can fine-tune (transfer learning) a foundational speech model on a specific language without tonnes of data. Pretrained models such as Whisper, Wav2Vec2-MMS and HuBERT exist. [OpenAI's Whisper model](https://huggingface.co/openai/whisper-large-v3) is a large multilingual model trained on 100+ languages and with 4 Million hours of speech.

The following detailed [blog post](https://huggingface.co/blog/fine-tune-whisper) shows how to fine-tune a pre-trained Whisper checkpoint on labeled data for ASR. With the right data and strategy you can fine-tune a high-performant model on a free Google Colab instance too. We suggest to read the blog post for more info!

## Hugging Face Whisper Event

On December 2022, over 450 participants collaborated, fine-tuned and shared 600+ ASR Whisper models in 100+ different languages. You can compare these models on the event's speech recognition [leaderboard](https://huggingface.co/spaces/whisper-event/leaderboard?dataset=mozilla-foundation%2Fcommon_voice_11_0&config=ar&split=test).

These events help democratize ASR for all languages, including low-resource languages. In addition to the trained models, the [event](https://github.com/huggingface/community-events/tree/main/whisper-fine-tuning-event) helps to build practical collaborative knowledge.

## Useful Resources

- [Hugging Face Audio Course](https://huggingface.co/learn/audio-course/chapter5/introduction)
- [Fine-tuning MetaAI's MMS Adapter Models for Multi-Lingual ASR](https://huggingface.co/blog/mms_adapters)
- [Making automatic speech recognition work on large files with Wav2Vec2 in 🤗 Transformers](https://huggingface.co/blog/asr-chunking)
- [Boosting Wav2Vec2 with n-grams in 🤗 Transformers](https://huggingface.co/blog/wav2vec2-with-ngram)
- [ML for Audio Study Group - Intro to Audio and ASR Deep Dive](https://www.youtube.com/watch?v=D-MH6YjuIlE)
- [Massively Multilingual ASR: 50 Languages, 1 Model, 1 Billion Parameters](https://arxiv.org/pdf/2007.03001.pdf)
- An ASR toolkit made by [NVIDIA: NeMo](https://github.com/NVIDIA/NeMo) with code and pretrained models useful for new ASR models. Watch the [introductory video](https://www.youtube.com/embed/wBgpMf_KQVw) for an overview.
- [An introduction to SpeechT5, a multi-purpose speech recognition and synthesis model](https://huggingface.co/blog/speecht5)
- [Fine-tune Whisper For Multilingual ASR with 🤗Transformers](https://huggingface.co/blog/fine-tune-whisper)
- [Automatic speech recognition task guide](https://huggingface.co/docs/transformers/tasks/asr)
- [Speech Synthesis, Recognition, and More With SpeechT5](https://huggingface.co/blog/speecht5)
- [Fine-Tune W2V2-Bert for low-resource ASR with 🤗 Transformers](https://huggingface.co/blog/fine-tune-w2v2-bert)
- [Speculative Decoding for 2x Faster Whisper Inference](https://huggingface.co/blog/whisper-speculative-decoding)
