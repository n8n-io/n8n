## Use Cases

### Sentiment Analysis on Customer Reviews

You can track the sentiments of your customers from the product reviews using sentiment analysis models. This can help understand churn and retention by grouping reviews by sentiment, to later analyze the text and make strategic decisions based on this knowledge.

## Task Variants

### Natural Language Inference (NLI)

In NLI the model determines the relationship between two given texts. Concretely, the model takes a premise and a hypothesis and returns a class that can either be:

- **entailment**, which means the hypothesis is true.
- **contraction**, which means the hypothesis is false.
- **neutral**, which means there's no relation between the hypothesis and the premise.

The benchmark dataset for this task is GLUE (General Language Understanding Evaluation). NLI models have different variants, such as Multi-Genre NLI, Question NLI and Winograd NLI.

### Multi-Genre NLI (MNLI)

MNLI is used for general NLI. Here are som examples:

```
Example 1:
    Premise: A man inspects the uniform of a figure in some East Asian country.
    Hypothesis: The man is sleeping.
    Label: Contradiction

Example 2:
    Premise: Soccer game with multiple males playing.
    Hypothesis: Some men are playing a sport.
    Label: Entailment
```

#### Inference

You can use the 🤗 Transformers library `text-classification` pipeline to infer with NLI models.

```python
from transformers import pipeline

classifier = pipeline("text-classification", model = "roberta-large-mnli")
classifier("A soccer game with multiple males playing. Some men are playing a sport.")
## [{'label': 'ENTAILMENT', 'score': 0.98}]
```

### Question Natural Language Inference (QNLI)

QNLI is the task of determining if the answer to a certain question can be found in a given document. If the answer can be found the label is “entailment”. If the answer cannot be found the label is “not entailment".

```
Question: What percentage of marine life died during the extinction?
Sentence: It is also known as the “Great Dying” because it is considered the largest mass extinction in the Earth’s history.
Label: not entailment

Question: Who was the London Weekend Television’s Managing Director?
Sentence: The managing director of London Weekend Television (LWT), Greg Dyke, met with the representatives of the "big five" football clubs in England in 1990.
Label: entailment
```

#### Inference

You can use the 🤗 Transformers library `text-classification` pipeline to infer with QNLI models. The model returns the label and the confidence.

```python
from transformers import pipeline

classifier = pipeline("text-classification", model = "cross-encoder/qnli-electra-base")
classifier("Where is the capital of France?, Paris is the capital of France.")
## [{'label': 'entailment', 'score': 0.997}]
```

### Sentiment Analysis

In Sentiment Analysis, the classes can be polarities like positive, negative, neutral, or sentiments such as happiness or anger.

#### Inference

You can use the 🤗 Transformers library with the `sentiment-analysis` pipeline to infer with Sentiment Analysis models. The model returns the label with the score.

```python
from transformers import pipeline

classifier = pipeline("sentiment-analysis")
classifier("I loved Star Wars so much!")
##  [{'label': 'POSITIVE', 'score': 0.99}
```

### Quora Question Pairs

Quora Question Pairs models assess whether two provided questions are paraphrases of each other. The model takes two questions and returns a binary value, with 0 being mapped to “not paraphrase” and 1 to “paraphrase". The benchmark dataset is [Quora Question Pairs](https://huggingface.co/datasets/glue/viewer/qqp/test) inside the [GLUE benchmark](https://huggingface.co/datasets/glue). The dataset consists of question pairs and their labels.

```
Question1: “How can I increase the speed of my internet connection while using a VPN?”
Question2: How can Internet speed be increased by hacking through DNS?
Label: Not paraphrase

Question1: “What can make Physics easy to learn?”
Question2: “How can you make physics easy to learn?”
Label: Paraphrase
```

#### Inference

You can use the 🤗 Transformers library `text-classification` pipeline to infer with QQPI models.

```python
from transformers import pipeline

classifier = pipeline("text-classification", model = "textattack/bert-base-uncased-QQP")
classifier("Which city is the capital of France?, Where is the capital of France?")
## [{'label': 'paraphrase', 'score': 0.998}]
```

You can use [huggingface.js](https://github.com/huggingface/huggingface.js) to infer text classification models on Hugging Face Hub.

```javascript
import { InferenceClient } from "@huggingface/inference";

const inference = new InferenceClient(HF_TOKEN);
await inference.conversational({
	model: "distilbert-base-uncased-finetuned-sst-2-english",
	inputs: "I love this movie!",
});
```

### Grammatical Correctness

Linguistic Acceptability is the task of assessing the grammatical acceptability of a sentence. The classes in this task are “acceptable” and “unacceptable”. The benchmark dataset used for this task is [Corpus of Linguistic Acceptability (CoLA)](https://huggingface.co/datasets/glue/viewer/cola/test). The dataset consists of texts and their labels.

```
Example: Books were sent to each other by the students.
Label: Unacceptable

Example: She voted for herself.
Label: Acceptable.
```

#### Inference

```python
from transformers import pipeline

classifier = pipeline("text-classification", model = "textattack/distilbert-base-uncased-CoLA")
classifier("I will walk to home when I went through the bus.")
##  [{'label': 'unacceptable', 'score': 0.95}]
```

## Useful Resources

Would you like to learn more about the topic? Awesome! Here you can find some curated resources that you may find helpful!

- [SetFitABSA: Few-Shot Aspect Based Sentiment Analysis using SetFit](https://huggingface.co/blog/setfit-absa)
- [Course Chapter on Fine-tuning a Text Classification Model](https://huggingface.co/course/chapter3/1?fw=pt)
- [Getting Started with Sentiment Analysis using Python](https://huggingface.co/blog/sentiment-analysis-python)
- [Sentiment Analysis on Encrypted Data with Homomorphic Encryption](https://huggingface.co/blog/sentiment-analysis-fhe)
- [Leveraging Hugging Face for complex text classification use cases](https://huggingface.co/blog/classification-use-cases)

### Notebooks

- [PyTorch](https://github.com/huggingface/notebooks/blob/master/examples/text_classification.ipynb)
- [TensorFlow](https://github.com/huggingface/notebooks/blob/master/examples/text_classification-tf.ipynb)
- [Flax](https://github.com/huggingface/notebooks/blob/master/examples/text_classification_flax.ipynb)

### Scripts for training

- [PyTorch](https://github.com/huggingface/transformers/tree/main/examples/pytorch/text-classification)
- [TensorFlow](https://github.com/huggingface/transformers/tree/main/examples/tensorflow/text-classification)
- [Flax](https://github.com/huggingface/transformers/tree/main/examples/flax/text-classification)

### Documentation

- [Text classification task guide](https://huggingface.co/docs/transformers/tasks/sequence_classification)
