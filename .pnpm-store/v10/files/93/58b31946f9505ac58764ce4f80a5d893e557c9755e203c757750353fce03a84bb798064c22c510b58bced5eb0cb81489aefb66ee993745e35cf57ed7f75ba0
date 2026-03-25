## Use Cases 🔍

### Information Retrieval

You can extract information from documents using Sentence Similarity models. The first step is to rank documents using Passage Ranking models. You can then get to the top ranked document and search it with Sentence Similarity models by selecting the sentence that has the most similarity to the input query.

## The Sentence Transformers library

The [Sentence Transformers](https://www.sbert.net/) library is very powerful for calculating embeddings of sentences, paragraphs, and entire documents. An embedding is just a vector representation of a text and is useful for finding how similar two texts are.

You can find and use [thousands of Sentence Transformers](https://huggingface.co/models?library=sentence-transformers&sort=downloads) models from the Hub by directly using the library, playing with the widgets in the browser or using Inference Endpoints.

## Task Variants

### Passage Ranking

Passage Ranking is the task of ranking documents based on their relevance to a given query. The task is evaluated on Mean Reciprocal Rank. These models take one query and multiple documents and return ranked documents according to the relevancy to the query. 📄

You can infer with Passage Ranking models using [Inference Endpoints](https://huggingface.co/inference-endpoints). The Passage Ranking model inputs are a query for which we look for relevancy in the documents and the documents we want to search. The model will return scores according to the relevancy of these documents for the query.

```python
import json
import requests

API_URL = "https://router.huggingface.co/hf-inference/models/sentence-transformers/msmarco-distilbert-base-tas-b"
headers = {"Authorization": f"Bearer {api_token}"}

def query(payload):
    response = requests.post(API_URL, headers=headers, json=payload)
    return response.json()

data = query(
    {
        "inputs": {
            "source_sentence": "That is a happy person",
            "sentences": [
                "That is a happy dog",
                "That is a very happy person",
                "Today is a sunny day"
            ]
        }
    }
## [0.853, 0.981, 0.655]
```

### Semantic Textual Similarity

Semantic Textual Similarity is the task of evaluating how similar two texts are in terms of meaning. These models take a source sentence and a list of sentences in which we will look for similarities and will return a list of similarity scores. The benchmark dataset is the [Semantic Textual Similarity Benchmark](http://ixa2.si.ehu.eus/stswiki/index.php/STSbenchmark). The task is evaluated on Pearson’s Rank Correlation.

```python
import json
import requests

API_URL = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2"
headers = {"Authorization": f"Bearer {api_token}"}

def query(payload):
    response = requests.post(API_URL, headers=headers, json=payload)
    return response.json()

data = query(
    {
        "inputs": {
            "source_sentence": "I'm very happy",
            "sentences":["I'm filled with happiness", "I'm happy"]
        }
    })

## [0.605, 0.894]
```

You can also infer with the models in the Hub using Sentence Transformer models.

```python
pip install -U sentence-transformers

from sentence_transformers import SentenceTransformer, util
sentences = ["I'm happy", "I'm full of happiness"]

model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

# Compute embedding for both lists
embedding_1 = model.encode(sentences[0], convert_to_tensor=True)
embedding_2 = model.encode(sentences[1], convert_to_tensor=True)

util.pytorch_cos_sim(embedding_1, embedding_2)
## tensor([[0.6003]])
```

## Useful Resources

Would you like to learn more about Sentence Transformers and Sentence Similarity? Awesome! Here you can find some curated resources that you may find helpful!

- [Sentence Transformers Documentation](https://www.sbert.net/)
- [Sentence Transformers in the Hub](https://huggingface.co/blog/sentence-transformers-in-the-hub)
- [Building a Playlist Generator with Sentence Transformers](https://huggingface.co/blog/playlist-generator)
- [Getting Started With Embeddings](https://huggingface.co/blog/getting-started-with-embeddings)
