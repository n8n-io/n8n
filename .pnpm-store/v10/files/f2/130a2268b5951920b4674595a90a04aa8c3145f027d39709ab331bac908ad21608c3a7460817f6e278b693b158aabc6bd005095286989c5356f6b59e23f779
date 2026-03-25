## Use Cases

Text-to-Speech (TTS) models can be used in any speech-enabled application that requires converting text to speech imitating human voice.

### Voice Assistants

TTS models are used to create voice assistants on smart devices. These models are a better alternative compared to concatenative methods where the assistant is built by recording sounds and mapping them, since the outputs in TTS models contain elements in natural speech such as emphasis.

### Announcement Systems

TTS models are widely used in airport and public transportation announcement systems to convert the announcement of a given text into speech.

## Inference Endpoints

The Hub contains over [1500 TTS models](https://huggingface.co/models?pipeline_tag=text-to-speech&sort=downloads) that you can use right away by trying out the widgets directly in the browser or calling the models as a service using Inference Endpoints. Here is a simple code snippet to get you started:

```python
import json
import requests

headers = {"Authorization": f"Bearer {API_TOKEN}"}
API_URL = "https://router.huggingface.co/hf-inference/models/microsoft/speecht5_tts"

def query(payload):
	response = requests.post(API_URL, headers=headers, json=payload)
	return response

output = query({"text_inputs": "Max is the best doggo."})
```

You can also use libraries such as [espnet](https://huggingface.co/models?library=espnet&pipeline_tag=text-to-speech&sort=downloads) or [transformers](https://huggingface.co/models?pipeline_tag=text-to-speech&library=transformers&sort=trending) if you want to handle the Inference directly.

## Direct Inference

Now, you can also use the Text-to-Speech pipeline in Transformers to synthesise high quality voice.

```python
from transformers import pipeline

synthesizer = pipeline("text-to-speech", "suno/bark")

synthesizer("Look I am generating speech in three lines of code!")
```

You can use [huggingface.js](https://github.com/huggingface/huggingface.js) to infer summarization models on Hugging Face Hub.

```javascript
import { InferenceClient } from "@huggingface/inference";

const inference = new InferenceClient(HF_TOKEN);
await inference.textToSpeech({
	model: "facebook/mms-tts",
	inputs: "text to generate speech from",
});
```

## Useful Resources

- [Hugging Face Audio Course](https://huggingface.co/learn/audio-course/chapter6/introduction)
- [ML for Audio Study Group - Text to Speech Deep Dive](https://www.youtube.com/watch?v=aLBedWj-5CQ)
- [Speech Synthesis, Recognition, and More With SpeechT5](https://huggingface.co/blog/speecht5)
- [Optimizing a Text-To-Speech model using 🤗 Transformers](https://huggingface.co/blog/optimizing-bark)
- [Train your own TTS models with Parler-TTS](https://github.com/huggingface/parler-tts)
