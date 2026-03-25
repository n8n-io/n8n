## Use Cases

### Domain Adaptation 👩‍⚕️

Masked language models do not require labelled data! They are trained by masking a couple of words in sentences and the model is expected to guess the masked word. This makes it very practical!

For example, masked language modeling is used to train large models for domain-specific problems. If you have to work on a domain-specific task, such as retrieving information from medical research papers, you can train a masked language model using those papers. 📄

The resulting model has a statistical understanding of the language used in medical research papers, and can be further trained in a process called fine-tuning to solve different tasks, such as [Text Classification](/tasks/text-classification) or [Question Answering](/tasks/question-answering) to build a medical research papers information extraction system. 👩‍⚕️ Pre-training on domain-specific data tends to yield better results (see [this paper](https://arxiv.org/abs/2007.15779) for an example).

If you don't have the data to train a masked language model, you can also use an existing [domain-specific masked language model](https://huggingface.co/microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext) from the Hub and fine-tune it with your smaller task dataset. That's the magic of Open Source and sharing your work! 🎉

## Inference with Fill-Mask Pipeline

You can use the 🤗 Transformers library `fill-mask` pipeline to do inference with masked language models. If a model name is not provided, the pipeline will be initialized with [distilroberta-base](/distilroberta-base). You can provide masked text and it will return a list of possible mask values ​​ranked according to the score.

```python
from transformers import pipeline

classifier = pipeline("fill-mask")
classifier("Paris is the <mask> of France.")

# [{'score': 0.7, 'sequence': 'Paris is the capital of France.'},
# {'score': 0.2, 'sequence': 'Paris is the birthplace of France.'},
# {'score': 0.1, 'sequence': 'Paris is the heart of France.'}]
```

## Useful Resources

Would you like to learn more about the topic? Awesome! Here you can find some curated resources that can be helpful to you!

- [Course Chapter on Fine-tuning a Masked Language Model](https://huggingface.co/course/chapter7/3?fw=pt)
- [Workshop on Pretraining Language Models and CodeParrot](https://www.youtube.com/watch?v=ExUR7w6xe94)
- [BERT 101: State Of The Art NLP Model Explained](https://huggingface.co/blog/bert-101)
- [Nyströmformer: Approximating self-attention in linear time and memory via the Nyström method](https://huggingface.co/blog/nystromformer)

### Notebooks

- [Pre-training an MLM for JAX/Flax](https://github.com/huggingface/notebooks/blob/master/examples/masked_language_modeling_flax.ipynb)
- [Masked language modeling in TensorFlow](https://github.com/huggingface/notebooks/blob/master/examples/language_modeling-tf.ipynb)
- [Masked language modeling in PyTorch](https://github.com/huggingface/notebooks/blob/master/examples/language_modeling.ipynb)

### Scripts for training

- [PyTorch](https://github.com/huggingface/transformers/tree/main/examples/pytorch/language-modeling)
- [Flax](https://github.com/huggingface/transformers/tree/main/examples/flax/language-modeling)
- [TensorFlow](https://github.com/huggingface/transformers/tree/main/examples/tensorflow/language-modeling)

### Documentation

- [Masked language modeling task guide](https://huggingface.co/docs/transformers/tasks/masked_language_modeling)
