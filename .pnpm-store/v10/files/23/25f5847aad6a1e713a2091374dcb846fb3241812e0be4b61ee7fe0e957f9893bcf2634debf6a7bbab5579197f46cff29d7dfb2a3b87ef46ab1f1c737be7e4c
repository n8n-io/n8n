## Use Cases

### Command Recognition

Command recognition or keyword spotting classifies utterances into a predefined set of commands. This is often done on-device for fast response time.

As an example, using the Google Speech Commands dataset, given an input, a model can classify which of the following commands the user is typing:

```
'yes', 'no', 'up', 'down', 'left', 'right', 'on', 'off', 'stop', 'go', 'unknown', 'silence'
```

Speechbrain models can easily perform this task with just a couple of lines of code!

```python
from speechbrain.pretrained import EncoderClassifier
model = EncoderClassifier.from_hparams(
  "speechbrain/google_speech_command_xvector"
)
model.classify_file("file.wav")
```

### Language Identification

Datasets such as VoxLingua107 allow anyone to train language identification models for up to 107 languages! This can be extremely useful as a preprocessing step for other systems. Here's an example [model](https://huggingface.co/TalTechNLP/voxlingua107-epaca-tdnn)trained on VoxLingua107.

### Emotion recognition

Emotion recognition is self explanatory. In addition to trying the widgets, you can use Inference Endpoints to perform audio classification. Here is a simple example that uses a [HuBERT](https://huggingface.co/superb/hubert-large-superb-er) model fine-tuned for this task.

```python
import json
import requests

headers = {"Authorization": f"Bearer {API_TOKEN}"}
API_URL = "https://router.huggingface.co/hf-inference/models/superb/hubert-large-superb-er"

def query(filename):
    with open(filename, "rb") as f:
        data = f.read()
    response = requests.request("POST", API_URL, headers=headers, data=data)
    return json.loads(response.content.decode("utf-8"))

data = query("sample1.flac")
# [{'label': 'neu', 'score': 0.60},
# {'label': 'hap', 'score': 0.20},
# {'label': 'ang', 'score': 0.13},
# {'label': 'sad', 'score': 0.07}]
```

You can use [huggingface.js](https://github.com/huggingface/huggingface.js) to infer with audio classification models on Hugging Face Hub.

```javascript
import { InferenceClient } from "@huggingface/inference";

const inference = new InferenceClient(HF_TOKEN);
await inference.audioClassification({
	data: await (await fetch("sample.flac")).blob(),
	model: "facebook/mms-lid-126",
});
```

### Speaker Identification

Speaker Identification is classifying the audio of the person speaking. Speakers are usually predefined. You can try out this task with [this model](https://huggingface.co/superb/wav2vec2-base-superb-sid). A useful dataset for this task is VoxCeleb1.

## Solving audio classification for your own data

We have some great news! You can do fine-tuning (transfer learning) to train a well-performing model without requiring as much data. Pretrained models such as Wav2Vec2 and HuBERT exist. [Facebook's Wav2Vec2 XLS-R model](https://huggingface.co/docs/transformers/model_doc/xlsr_wav2vec2) is a large multilingual model trained on 128 languages and with 436K hours of speech. Similarly, you can also use [OpenAI's Whisper](https://huggingface.co/docs/transformers/model_doc/whisper) trained on up to 4 Million hours of multilingual speech data for this task too!

## Useful Resources

Would you like to learn more about the topic? Awesome! Here you can find some curated resources that you may find helpful!

### Notebooks

- [PyTorch](https://colab.research.google.com/github/huggingface/notebooks/blob/master/examples/audio_classification.ipynb)

### Scripts for training

- [PyTorch](https://github.com/huggingface/transformers/tree/main/examples/pytorch/audio-classification)

### Documentation

- [Hugging Face Audio Course](https://huggingface.co/learn/audio-course/chapter4/introduction)
- [Audio classification task guide](https://huggingface.co/docs/transformers/tasks/audio_classification)
