"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const taskData = {
    datasets: [
        {
            description: "The WikiTableQuestions dataset is a large-scale dataset for the task of question answering on semi-structured tables.",
            id: "wikitablequestions",
        },
        {
            description: "WikiSQL is a dataset of 80654 hand-annotated examples of questions and SQL queries distributed across 24241 tables from Wikipedia.",
            id: "wikisql",
        },
    ],
    demo: {
        inputs: [
            {
                table: [
                    ["Rank", "Name", "No.of reigns", "Combined days"],
                    ["1", "lou Thesz", "3", "3749"],
                    ["2", "Ric Flair", "8", "3103"],
                    ["3", "Harley Race", "7", "1799"],
                ],
                type: "tabular",
            },
            { label: "Question", content: "What is the number of reigns for Harley Race?", type: "text" },
        ],
        outputs: [{ label: "Result", content: "7", type: "text" }],
    },
    metrics: [
        {
            description: "Checks whether the predicted answer(s) is the same as the ground-truth answer(s).",
            id: "Denotation Accuracy",
        },
    ],
    models: [
        {
            description: "A table question answering model that is capable of neural SQL execution, i.e., employ TAPEX to execute a SQL query on a given table.",
            id: "microsoft/tapex-base",
        },
        {
            description: "A robust table question answering model.",
            id: "google/tapas-base-finetuned-wtq",
        },
    ],
    spaces: [
        {
            description: "An application that answers questions based on table CSV files.",
            id: "katanaml/table-query",
        },
    ],
    summary: "Table Question Answering (Table QA) is the answering a question about an information on a given table.",
    widgetModels: ["google/tapas-base-finetuned-wtq"],
};
exports.default = taskData;
