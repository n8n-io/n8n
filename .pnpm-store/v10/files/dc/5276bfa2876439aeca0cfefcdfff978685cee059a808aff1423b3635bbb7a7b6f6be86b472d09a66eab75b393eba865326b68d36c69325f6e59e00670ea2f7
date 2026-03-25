## Use Cases

You can find over a thousand Translation models on the Hub, but sometimes you might not find a model for the language pair you are interested in. When this happen, you can use a pretrained multilingual Translation model like [mBART](https://huggingface.co/facebook/mbart-large-cc25) and further train it on your own data in a process called fine-tuning.

### Multilingual conversational agents

Translation models can be used to build conversational agents across different languages. This can be done in two ways.

- **Translate the dataset to a new language.** You can translate a dataset of intents (inputs) and responses to the target language. You can then train a new intent classification model with this new dataset. This allows you to proofread responses in the target language and have better control of the chatbot's outputs.

* **Translate the input and output of the agent.** You can use a Translation model in user inputs so that the chatbot can process it. You can then translate the output of the chatbot into the language of the user. This approach might be less reliable as the chatbot will generate responses that were not defined before.

## Inference

You can use the 🤗 Transformers library with the `translation_xx_to_yy` pattern where xx is the source language code and yy is the target language code. The default model for the pipeline is [t5-base](https://huggingface.co/t5-base) which under the hood adds a task prefix indicating the task itself, e.g. “translate: English to French”.

```python
from transformers import pipeline
en_fr_translator = pipeline("translation_en_to_fr")
en_fr_translator("How old are you?")
## [{'translation_text': ' quel âge êtes-vous?'}]
```

If you’d like to use a specific model checkpoint that is from one specific language to another, you can also directly use the `translation` pipeline.

```python
from transformers import pipeline

model_checkpoint = "Helsinki-NLP/opus-mt-en-fr"
translator = pipeline("translation", model=model_checkpoint)
translator("How are you?")
# [{'translation_text': 'Comment allez-vous ?'}]
```

You can use [huggingface.js](https://github.com/huggingface/huggingface.js) to infer translation models on Hugging Face Hub.

```javascript
import { InferenceClient } from "@huggingface/inference";

const inference = new InferenceClient(HF_TOKEN);
await inference.translation({
	model: "t5-base",
	inputs: "My name is Wolfgang and I live in Berlin",
});
```

## Useful Resources

Would you like to learn more about Translation? Great! Here you can find some curated resources that you may find helpful!

- [Course Chapter on Translation](https://huggingface.co/course/chapter7/4?fw=pt)

### Notebooks

- [PyTorch](https://github.com/huggingface/notebooks/blob/master/examples/translation.ipynb)
- [TensorFlow](https://github.com/huggingface/notebooks/blob/master/examples/translation-tf.ipynb)

### Scripts for training

- [PyTorch](https://github.com/huggingface/transformers/tree/main/examples/pytorch/translation)
- [TensorFlow](https://github.com/huggingface/transformers/tree/main/examples/tensorflow/translation)

### Documentation

- [Translation task guide](https://huggingface.co/docs/transformers/tasks/translation)
