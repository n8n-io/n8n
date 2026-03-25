## Use Cases

### Speech Enhancement (Noise removal)

Speech Enhancement is a bit self explanatory. It improves (or enhances) the quality of an audio by removing noise. There are multiple libraries to solve this task, such as Speechbrain, Asteroid and ESPNet. Here is a simple example using Speechbrain

```python
from speechbrain.pretrained import SpectralMaskEnhancement
model = SpectralMaskEnhancement.from_hparams(
  "speechbrain/mtl-mimic-voicebank"
)
model.enhance_file("file.wav")
```

Alternatively, you can use [Inference Endpoints](https://huggingface.co/inference-endpoints) to solve this task

```python
import json
import requests

headers = {"Authorization": f"Bearer {API_TOKEN}"}
API_URL = "https://router.huggingface.co/hf-inference/models/speechbrain/mtl-mimic-voicebank"

def query(filename):
    with open(filename, "rb") as f:
        data = f.read()
    response = requests.request("POST", API_URL, headers=headers, data=data)
    return json.loads(response.content.decode("utf-8"))

data = query("sample1.flac")
```

You can use [huggingface.js](https://github.com/huggingface/huggingface.js) to infer with audio-to-audio models on Hugging Face Hub.

```javascript
import { InferenceClient } from "@huggingface/inference";

const inference = new InferenceClient(HF_TOKEN);
await inference.audioToAudio({
	data: await (await fetch("sample.flac")).blob(),
	model: "speechbrain/sepformer-wham",
});
```

### Audio Source Separation

Audio Source Separation allows you to isolate different sounds from individual sources. For example, if you have an audio file with multiple people speaking, you can get an audio file for each of them. You can then use an Automatic Speech Recognition system to extract the text from each of these sources as an initial step for your system!

Audio-to-Audio can also be used to remove noise from audio files: you get one audio for the person speaking and another audio for the noise. This can also be useful when you have multi-person audio with some noise: yyou can get one audio for each person and then one audio for the noise.

## Training a model for your own data

If you want to learn how to train models for the Audio-to-Audio task, we recommend the following tutorials:

- [Speech Enhancement](https://speechbrain.github.io/tutorial_enhancement.html)
- [Source Separation](https://speechbrain.github.io/tutorial_separation.html)
