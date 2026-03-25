## Use Cases 🔍

### Information Retrieval

You can improve Information Retrieval search stacks by applying a Text Ranking model as a Reranker in the common "[Retrieve and Rerank pipeline](https://sbert.net/examples/applications/retrieve_rerank/README.html)". First, you can use a [Sentence Similarity](https://huggingface.co/tasks/sentence-similarity) or [Feature Extraction](https://huggingface.co/tasks/feature-extraction) model as a Retriever to find the (for example) 100 most relevant documents for a query. Afterwards, you can rerank each of these 100 documents with a Text Ranking model to select an updated top 10. Often times, this results in improved retrieval performance than only using a Retriever model.

## The Sentence Transformers library

The [Sentence Transformers](https://www.sbert.net/) library is very powerful for using and training both Sentence Transformer (a.k.a. embedding or retriever) models as well as Cross Encoder (a.k.a. reranker) models.

You can find and use [Sentence Transformers](https://huggingface.co/models?library=sentence-transformers&sort=downloads) models from the Hub by directly using the library, playing with the widgets in the browser or using Inference Endpoints.

## Task Variants

### Passage Ranking

Passage Ranking is the task of ranking documents based on their relevance to a given query. The task is evaluated on Normalized Discounted Cumulative Gain, Mean Reciprocal Rank, or Mean Average Precision. These models take one query and multiple documents and return ranked documents according to the relevancy to the query. 📄

You can use it via the [Sentence Transformers library](https://sbert.net/docs/cross_encoder/usage/usage.html) like so:

```python
from sentence_transformers import CrossEncoder

# 1. Load a pre-trained CrossEncoder model
model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L6-v2")

query = "How many people live in Berlin?"
passages = [
    "Berlin had a population of 3,520,031 registered inhabitants in an area of 891.82 square kilometers.",
    "Berlin is well known for its museums.",
    "In 2014, the city state Berlin had 37,368 live births (+6.6%), a record number since 1991.",
    "The urban area of Berlin comprised about 4.1 million people in 2014, making it the seventh most populous urban area in the European Union.",
    "The city of Paris had a population of 2,165,423 people within its administrative city limits as of January 1, 2019",
    "An estimated 300,000-420,000 Muslims reside in Berlin, making up about 8-11 percent of the population.",
    "Berlin is subdivided into 12 boroughs or districts (Bezirke).",
    "In 2015, the total labour force in Berlin was 1.85 million.",
    "In 2013 around 600,000 Berliners were registered in one of the more than 2,300 sport and fitness clubs.",
    "Berlin has a yearly total of about 135 million day visitors, which puts it in third place among the most-visited city destinations in the European Union.",
]

# 2a. Either: predict scores for all pairs of sentences involved in the query
scores = model.predict([(query, passage) for passage in passages])
# => [ 8.607138   -4.320077    7.5978117   8.915804   -4.237982    8.2359  0.33119553  3.4510403   6.352979    5.416662  ]

# 2b. Or rank a list of passages for a query
ranks = model.rank(query, passages, return_documents=True)

# Print the reranked passages
print("Query:", query)
for rank in ranks:
    print(f"- #{rank['corpus_id']} ({rank['score']:.2f}): {rank['text']}")
"""
Query: How many people live in Berlin?
- #3 (8.92): The urban area of Berlin comprised about 4.1 million people in 2014, making it the seventh most populous urban area in the European Union.
- #0 (8.61): Berlin had a population of 3,520,031 registered inhabitants in an area of 891.82 square kilometers.
- #5 (8.24): An estimated 300,000-420,000 Muslims reside in Berlin, making up about 8-11 percent of the population.
- #2 (7.60): In 2014, the city state Berlin had 37,368 live births (+6.6%), a record number since 1991.
- #8 (6.35): In 2013 around 600,000 Berliners were registered in one of the more than 2,300 sport and fitness clubs.
- #9 (5.42): Berlin has a yearly total of about 135 million day visitors, which puts it in third place among the most-visited city destinations in the European Union.
- #7 (3.45): In 2015, the total labour force in Berlin was 1.85 million.
- #6 (0.33): Berlin is subdivided into 12 boroughs or districts (Bezirke).
- #4 (-4.24): The city of Paris had a population of 2,165,423 people within its administrative city limits as of January 1, 2019
- #1 (-4.32): Berlin is well known for its museums.
"""
```

Rerankers often outperform [Sentence Similarity](https://huggingface.co/tasks/sentence-similarity) or [Feature Extraction](https://huggingface.co/tasks/feature-extraction) models, but they're too slow to rank a query against all documents. This is why they're commonly used to perform a final reranking of the top documents from a retriever: you can get the efficiency of a retriever model with the performance of a reranker.

## Useful Resources

Would you like to learn more about Text Ranking? Here is a curated resource that you may find helpful!

- [Sentence Transformers > Cross Encoder Documentation](https://www.sbert.net/docs/cross_encoder/usage/usage.html)
- [Sentence Transformers > Usage > Retrieve & Re-Rank](https://www.sbert.net/examples/applications/retrieve_rerank/README.html)
