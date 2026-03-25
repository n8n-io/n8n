## Use Cases

### Information Extraction from Invoices

You can extract entities of interest from invoices automatically using Named Entity Recognition (NER) models. Invoices can be read with Optical Character Recognition models and the output can be used to do inference with NER models. In this way, important information such as date, company name, and other named entities can be extracted.

## Task Variants

### Named Entity Recognition (NER)

NER is the task of recognizing named entities in a text. These entities can be the names of people, locations, or organizations. The task is formulated as labeling each token with a class for each named entity and a class named "0" for tokens that do not contain any entities. The input for this task is text and the output is the annotated text with named entities.

#### Inference

You can use the 🤗 Transformers library `ner` pipeline to infer with NER models.

```python
from transformers import pipeline

classifier = pipeline("ner")
classifier("Hello I'm Omar and I live in Zürich.")
```

### Part-of-Speech (PoS) Tagging
In PoS tagging, the model recognizes parts of speech, such as nouns, pronouns, adjectives, or verbs, in a given text. The task is formulated as labeling each word with a part of the speech.

#### Inference

You can use the 🤗 Transformers library `token-classification` pipeline with a POS tagging model of your choice. The model will return a json with PoS tags for each token.

```python
from transformers import pipeline

classifier = pipeline("token-classification", model = "vblagoje/bert-english-uncased-finetuned-pos")
classifier("Hello I'm Omar and I live in Zürich.")
```

This is not limited to transformers! You can also use other libraries such as Stanza, spaCy, and Flair to do inference! Here is an example using a canonical [spaCy](https://hf.co/blog/spacy) model.

```python
!pip install https://huggingface.co/spacy/en_core_web_sm/resolve/main/en_core_web_sm-any-py3-none-any.whl

import en_core_web_sm

nlp = en_core_web_sm.load()
doc = nlp("I'm Omar and I live in Zürich.")
for token in doc:
    print(token.text, token.pos_, token.dep_, token.ent_type_)

## I PRON nsubj
## 'm AUX ROOT
## Omar PROPN attr PERSON
### ...
```

## Useful Resources

Would you like to learn more about token classification? Great! Here you can find some curated resources that you may find helpful!

- [Course Chapter on Token Classification](https://huggingface.co/course/chapter7/2?fw=pt)
- [Blog post: Welcome spaCy to the Hugging Face Hub](https://huggingface.co/blog/spacy)

### Notebooks

- [PyTorch](https://github.com/huggingface/notebooks/blob/master/examples/token_classification.ipynb)
- [TensorFlow](https://github.com/huggingface/notebooks/blob/master/examples/token_classification-tf.ipynb)

### Scripts for training

- [PyTorch](https://github.com/huggingface/transformers/tree/main/examples/pytorch/token-classification)
- [TensorFlow](https://github.com/huggingface/transformers/tree/main/examples/tensorflow)
- [Flax](https://github.com/huggingface/transformers/tree/main/examples/flax/token-classification)

### Documentation

- [Token classification task guide](https://huggingface.co/docs/transformers/tasks/token_classification)
