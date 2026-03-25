## Use Cases

### Transfer Learning

Models trained on a specific dataset can learn features about the data. For instance, a model trained on an English poetry dataset learns English grammar at a very high level. This information can be transferred to a new model that is going to be trained on tweets. This process of extracting features and transferring to another model is called transfer learning. One can pass their dataset through a feature extraction pipeline and feed the result to a classifier.

### Retrieval and Reranking

Retrieval is the process of obtaining relevant documents or information based on a user's search query. In the context of NLP, retrieval systems aim to find relevant text passages or documents from a large corpus of data that match the user's query. The goal is to return a set of results that are likely to be useful to the user. On the other hand, reranking is a technique used to improve the quality of retrieval results by reordering them based on their relevance to the query.

### Retrieval Augmented Generation

Retrieval-augmented generation (RAG) is a technique in which user inputs to generative models are first queried through a knowledge base, and the most relevant information from the knowledge base is used to augment the prompt to reduce hallucinations during generation. Feature extraction models (primarily retrieval and reranking models) can be used in RAG to reduce model hallucinations and ground the model.

## Inference

You can infer feature extraction models using `pipeline` of transformers library.

```python
from transformers import pipeline
checkpoint = "facebook/bart-base"
feature_extractor = pipeline("feature-extraction", framework="pt", model=checkpoint)
text = "Transformers is an awesome library!"

#Reducing along the first dimension to get a 768 dimensional array
feature_extractor(text,return_tensors = "pt")[0].numpy().mean(axis=0)

'''tensor([[[ 2.5834,  2.7571,  0.9024,  ...,  1.5036, -0.0435, -0.8603],
         [-1.2850, -1.0094, -2.0826,  ...,  1.5993, -0.9017,  0.6426],
         [ 0.9082,  0.3896, -0.6843,  ...,  0.7061,  0.6517,  1.0550],
         ...,
         [ 0.6919, -1.1946,  0.2438,  ...,  1.3646, -1.8661, -0.1642],
         [-0.1701, -2.0019, -0.4223,  ...,  0.3680, -1.9704, -0.0068],
         [ 0.2520, -0.6869, -1.0582,  ...,  0.5198, -2.2106,  0.4547]]])'''
```

A very popular library for training similarity and search models is called `sentence-transformers`.  To get started, install the library.

```bash
pip install -U sentence-transformers
```

You can infer with `sentence-transformers` models as follows.

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
sentences = [
    "The weather is lovely today.",
    "It's so sunny outside!",
    "He drove to the stadium.",
]

embeddings = model.encode(sentences)
similarities = model.similarity(embeddings, embeddings)
print(similarities)
# tensor([[1.0000, 0.6660, 0.1046],
#         [0.6660, 1.0000, 0.1411],
#         [0.1046, 0.1411, 1.0000]])
```

### Text Embedding Inference

[Text Embeddings Inference (TEI)](https://github.com/huggingface/text-embeddings-inference) is a toolkit to easily serve feature extraction models using few lines of code.

## Useful resources

- [Documentation for feature extraction task in 🤗Transformers](https://huggingface.co/docs/transformers/main_classes/feature_extractor)
- [Introduction to MTEB Benchmark](https://huggingface.co/blog/mteb)
- [Cookbook: Simple RAG for GitHub issues using Hugging Face Zephyr and LangChain](https://huggingface.co/learn/cookbook/rag_zephyr_langchain)
- [sentence-transformers organization on Hugging Face Hub](https://huggingface.co/sentence-transformers)
