const taskData = {
    datasets: [
        {
            description: "A common dataset that is used to train models for many languages.",
            id: "wikipedia",
        },
        {
            description: "A large English dataset with text crawled from the web.",
            id: "c4",
        },
    ],
    demo: {
        inputs: [
            {
                label: "Input",
                content: "The <mask> barked at me",
                type: "text",
            },
        ],
        outputs: [
            {
                type: "chart",
                data: [
                    {
                        label: "wolf",
                        score: 0.487,
                    },
                    {
                        label: "dog",
                        score: 0.061,
                    },
                    {
                        label: "cat",
                        score: 0.058,
                    },
                    {
                        label: "fox",
                        score: 0.047,
                    },
                    {
                        label: "squirrel",
                        score: 0.025,
                    },
                ],
            },
        ],
    },
    metrics: [
        {
            description: "Cross Entropy is a metric that calculates the difference between two probability distributions. Each probability distribution is the distribution of predicted words",
            id: "cross_entropy",
        },
        {
            description: "Perplexity is the exponential of the cross-entropy loss. It evaluates the probabilities assigned to the next word by the model. Lower perplexity indicates better performance",
            id: "perplexity",
        },
    ],
    models: [
        {
            description: "State-of-the-art masked language model.",
            id: "answerdotai/ModernBERT-large",
        },
        {
            description: "A multilingual model trained on 100 languages.",
            id: "FacebookAI/xlm-roberta-base",
        },
    ],
    spaces: [],
    summary: "Masked language modeling is the task of masking some of the words in a sentence and predicting which words should replace those masks. These models are useful when we want to get a statistical understanding of the language in which the model is trained in.",
    widgetModels: ["distilroberta-base"],
    youtubeId: "mqElG5QJWUg",
};
export default taskData;
