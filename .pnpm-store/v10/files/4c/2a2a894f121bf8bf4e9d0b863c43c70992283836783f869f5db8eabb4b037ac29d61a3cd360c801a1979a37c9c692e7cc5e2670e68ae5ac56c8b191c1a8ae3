const taskData = {
    datasets: [
        {
            // TODO write proper description
            description: "A famous question answering dataset based on English articles from Wikipedia.",
            id: "squad_v2",
        },
        {
            // TODO write proper description
            description: "A dataset of aggregated anonymized actual queries issued to the Google search engine.",
            id: "natural_questions",
        },
    ],
    demo: {
        inputs: [
            {
                label: "Question",
                content: "Which name is also used to describe the Amazon rainforest in English?",
                type: "text",
            },
            {
                label: "Context",
                content: "The Amazon rainforest, also known in English as Amazonia or the Amazon Jungle",
                type: "text",
            },
        ],
        outputs: [
            {
                label: "Answer",
                content: "Amazonia",
                type: "text",
            },
        ],
    },
    metrics: [
        {
            description: "Exact Match is a metric based on the strict character match of the predicted answer and the right answer. For answers predicted correctly, the Exact Match will be 1. Even if only one character is different, Exact Match will be 0",
            id: "exact-match",
        },
        {
            description: " The F1-Score metric is useful if we value both false positives and false negatives equally. The F1-Score is calculated on each word in the predicted sequence against the correct answer",
            id: "f1",
        },
    ],
    models: [
        {
            description: "A robust baseline model for most question answering domains.",
            id: "deepset/roberta-base-squad2",
        },
        {
            description: "Small yet robust model that can answer questions.",
            id: "distilbert/distilbert-base-cased-distilled-squad",
        },
        {
            description: "A special model that can answer questions from tables.",
            id: "google/tapas-base-finetuned-wtq",
        },
    ],
    spaces: [
        {
            description: "An application that can answer a long question from Wikipedia.",
            id: "deepset/wikipedia-assistant",
        },
    ],
    summary: "Question Answering models can retrieve the answer to a question from a given text, which is useful for searching for an answer in a document. Some question answering models can generate answers without context!",
    widgetModels: ["deepset/roberta-base-squad2"],
    youtubeId: "ajPx5LwJD-I",
};
export default taskData;
