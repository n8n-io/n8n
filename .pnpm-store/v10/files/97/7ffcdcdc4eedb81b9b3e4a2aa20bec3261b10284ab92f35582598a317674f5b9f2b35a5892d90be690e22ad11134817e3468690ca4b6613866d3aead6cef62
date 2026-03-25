const taskData = {
    datasets: [
        {
            description: "Wikipedia dataset containing cleaned articles of all languages. Can be used to train `feature-extraction` models.",
            id: "wikipedia",
        },
    ],
    demo: {
        inputs: [
            {
                label: "Input",
                content: "India, officially the Republic of India, is a country in South Asia.",
                type: "text",
            },
        ],
        outputs: [
            {
                table: [
                    ["Dimension 1", "Dimension 2", "Dimension 3"],
                    ["2.583383083343506", "2.757075071334839", "0.9023529887199402"],
                    ["8.29393482208252", "1.1071064472198486", "2.03399395942688"],
                    ["-0.7754912972450256", "-1.647324562072754", "-0.6113331913948059"],
                    ["0.07087723910808563", "1.5942802429199219", "1.4610432386398315"],
                ],
                type: "tabular",
            },
        ],
    },
    metrics: [],
    models: [
        {
            description: "A powerful feature extraction model for natural language processing tasks.",
            id: "thenlper/gte-large",
        },
        {
            description: "A strong feature extraction model for retrieval.",
            id: "Alibaba-NLP/gte-Qwen1.5-7B-instruct",
        },
    ],
    spaces: [
        {
            description: "A leaderboard to rank text feature extraction models based on a benchmark.",
            id: "mteb/leaderboard",
        },
        {
            description: "A leaderboard to rank best feature extraction models based on human feedback.",
            id: "mteb/arena",
        },
    ],
    summary: "Feature extraction is the task of extracting features learnt in a model.",
    widgetModels: ["facebook/bart-base"],
};
export default taskData;
