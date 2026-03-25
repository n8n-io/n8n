## Use Cases

### Research Paper Summarization 🧐

Research papers can be summarized to allow researchers to spend less time selecting which articles to read. There are several approaches you can take for a task like this:

1. Use an existing extractive summarization model on the Hub to do inference.
2. Pick an existing language model trained for academic papers. This model can then be trained in a process called fine-tuning so it can solve the summarization task.
3. Use a sequence-to-sequence model like [T5](https://huggingface.co/docs/transformers/model_doc/t5) for abstractive text summarization.

## Inference

You can use the 🤗 Transformers library `summarization` pipeline to infer with existing Summarization models. If no model name is provided the pipeline will be initialized with [sshleifer/distilbart-cnn-12-6](https://huggingface.co/sshleifer/distilbart-cnn-12-6).

```python
from transformers import pipeline

classifier = pipeline("summarization")
classifier("Paris is the capital and most populous city of France, with an estimated population of 2,175,601 residents as of 2018, in an area of more than 105 square kilometres (41 square miles). The City of Paris is the centre and seat of government of the region and province of Île-de-France, or Paris Region, which has an estimated population of 12,174,880, or about 18 percent of the population of France as of 2017.")
## [{ "summary_text": " Paris is the capital and most populous city of France..." }]
```

You can use [huggingface.js](https://github.com/huggingface/huggingface.js) to infer summarization models on Hugging Face Hub.

```javascript
import { InferenceClient } from "@huggingface/inference";

const inference = new InferenceClient(HF_TOKEN);
const inputs =
	"Paris is the capital and most populous city of France, with an estimated population of 2,175,601 residents as of 2018, in an area of more than 105 square kilometres (41 square miles). The City of Paris is the centre and seat of government of the region and province of Île-de-France, or Paris Region, which has an estimated population of 12,174,880, or about 18 percent of the population of France as of 2017.";

await inference.summarization({
	model: "sshleifer/distilbart-cnn-12-6",
	inputs,
});
```

## Useful Resources

Would you like to learn more about the topic? Awesome! Here you can find some curated resources that you may find helpful!

- [Course Chapter on Summarization](https://huggingface.co/course/chapter7/5?fw=pt)
- [Distributed Training: Train BART/T5 for Summarization using 🤗 Transformers and Amazon SageMaker](https://huggingface.co/blog/sagemaker-distributed-training-seq2seq)

### Notebooks

- [PyTorch](https://github.com/huggingface/notebooks/blob/master/examples/summarization.ipynb)
- [TensorFlow](https://github.com/huggingface/notebooks/blob/master/examples/summarization-tf.ipynb)

### Scripts for training

- [PyTorch](https://github.com/huggingface/transformers/tree/main/examples/pytorch/summarization)
- [TensorFlow](https://github.com/huggingface/transformers/tree/main/examples/tensorflow/summarization)
- [Flax](https://github.com/huggingface/transformers/tree/main/examples/flax/summarization)

### Documentation

- [Summarization task guide](https://huggingface.co/docs/transformers/tasks/summarization)
