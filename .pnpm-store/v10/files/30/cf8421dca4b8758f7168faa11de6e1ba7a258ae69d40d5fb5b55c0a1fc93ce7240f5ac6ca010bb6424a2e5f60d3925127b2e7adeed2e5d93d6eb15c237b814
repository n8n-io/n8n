const taskData = {
    datasets: [
        {
            description: "Bing queries with relevant passages from various web sources.",
            id: "microsoft/ms_marco",
        },
    ],
    demo: {
        inputs: [
            {
                label: "Source sentence",
                content: "Machine learning is so easy.",
                type: "text",
            },
            {
                label: "Sentences to compare to",
                content: "Deep learning is so straightforward.",
                type: "text",
            },
            {
                label: "",
                content: "This is so difficult, like rocket science.",
                type: "text",
            },
            {
                label: "",
                content: "I can't believe how much I struggled with this.",
                type: "text",
            },
        ],
        outputs: [
            {
                type: "chart",
                data: [
                    {
                        label: "Deep learning is so straightforward.",
                        score: 0.623,
                    },
                    {
                        label: "This is so difficult, like rocket science.",
                        score: 0.413,
                    },
                    {
                        label: "I can't believe how much I struggled with this.",
                        score: 0.256,
                    },
                ],
            },
        ],
    },
    metrics: [
        {
            description: "Reciprocal Rank is a measure used to rank the relevancy of documents given a set of documents. Reciprocal Rank is the reciprocal of the rank of the document retrieved, meaning, if the rank is 3, the Reciprocal Rank is 0.33. If the rank is 1, the Reciprocal Rank is 1",
            id: "Mean Reciprocal Rank",
        },
        {
            description: "The similarity of the embeddings is evaluated mainly on cosine similarity. It is calculated as the cosine of the angle between two vectors. It is particularly useful when your texts are not the same length",
            id: "Cosine Similarity",
        },
    ],
    models: [
        {
            description: "This model works well for sentences and paragraphs and can be used for clustering/grouping and semantic searches.",
            id: "sentence-transformers/all-mpnet-base-v2",
        },
        {
            description: "A multilingual robust sentence similarity model.",
            id: "BAAI/bge-m3",
        },
        {
            description: "A robust sentence similarity model.",
            id: "HIT-TMG/KaLM-embedding-multilingual-mini-instruct-v1.5",
        },
    ],
    spaces: [
        {
            description: "An application that leverages sentence similarity to answer questions from YouTube videos.",
            id: "Gradio-Blocks/Ask_Questions_To_YouTube_Videos",
        },
        {
            description: "An application that retrieves relevant PubMed abstracts for a given online article which can be used as further references.",
            id: "Gradio-Blocks/pubmed-abstract-retriever",
        },
        {
            description: "An application that leverages sentence similarity to summarize text.",
            id: "nickmuchi/article-text-summarizer",
        },
        {
            description: "A guide that explains how Sentence Transformers can be used for semantic search.",
            id: "sentence-transformers/Sentence_Transformers_for_semantic_search",
        },
    ],
    summary: "Sentence Similarity is the task of determining how similar two texts are. Sentence similarity models convert input texts into vectors (embeddings) that capture semantic information and calculate how close (similar) they are between them. This task is particularly useful for information retrieval and clustering/grouping.",
    widgetModels: ["BAAI/bge-small-en-v1.5"],
    youtubeId: "VCZq5AkbNEU",
};
export default taskData;
