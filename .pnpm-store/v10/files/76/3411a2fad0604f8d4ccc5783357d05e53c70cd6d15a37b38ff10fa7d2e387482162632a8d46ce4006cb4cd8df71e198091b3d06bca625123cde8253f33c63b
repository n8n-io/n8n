const inputsZeroShotClassification = () => `"Hi, I recently bought a device from your company but it is not working as advertised and I would like to get reimbursed!"`;
const inputsTranslation = () => `"Меня зовут Вольфганг и я живу в Берлине"`;
const inputsSummarization = () => `"The tower is 324 metres (1,063 ft) tall, about the same height as an 81-storey building, and the tallest structure in Paris. Its base is square, measuring 125 metres (410 ft) on each side. During its construction, the Eiffel Tower surpassed the Washington Monument to become the tallest man-made structure in the world, a title it held for 41 years until the Chrysler Building in New York City was finished in 1930. It was the first structure to reach a height of 300 metres. Due to the addition of a broadcasting aerial at the top of the tower in 1957, it is now taller than the Chrysler Building by 5.2 metres (17 ft). Excluding transmitters, the Eiffel Tower is the second tallest free-standing structure in France after the Millau Viaduct."`;
const inputsTableQuestionAnswering = () => `{
    "query": "How many stars does the transformers repository have?",
    "table": {
        "Repository": ["Transformers", "Datasets", "Tokenizers"],
        "Stars": ["36542", "4512", "3934"],
        "Contributors": ["651", "77", "34"],
        "Programming language": [
            "Python",
            "Python",
            "Rust, Python and NodeJS"
        ]
    }
}`;
const inputsVisualQuestionAnswering = () => `{
        "image": "cat.png",
        "question": "What is in this image?"
    }`;
const inputsQuestionAnswering = () => `{
    "question": "What is my name?",
    "context": "My name is Clara and I live in Berkeley."
}`;
const inputsTextClassification = () => `"I like you. I love you"`;
const inputsTokenClassification = () => `"My name is Sarah Jessica Parker but you can call me Jessica"`;
const inputsTextGeneration = (model) => {
    if (model.tags.includes("conversational")) {
        return model.pipeline_tag === "text-generation"
            ? [{ role: "user", content: "What is the capital of France?" }]
            : [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Describe this image in one sentence.",
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: "https://cdn.britannica.com/61/93061-050-99147DCE/Statue-of-Liberty-Island-New-York-Bay.jpg",
                            },
                        },
                    ],
                },
            ];
    }
    return `"Can you please let us know more details about your "`;
};
const inputsFillMask = (model) => `"The answer to the universe is ${model.mask_token}."`;
const inputsSentenceSimilarity = () => `{
    "source_sentence": "That is a happy person",
    "sentences": [
        "That is a happy dog",
        "That is a very happy person",
        "Today is a sunny day"
    ]
}`;
const inputsFeatureExtraction = () => `"Today is a sunny day and I will get some ice cream."`;
const inputsImageClassification = () => `"cats.jpg"`;
const inputsImageToText = () => `"cats.jpg"`;
const inputsImageToImage = () => `{
    "image": "cat.png",
    "prompt": "Turn the cat into a tiger."
}`;
const inputsImageToVideo = () => `{
    "image": "cat.png",
    "prompt": "The cat starts to dance"
}`;
const inputsImageSegmentation = () => `"cats.jpg"`;
const inputsObjectDetection = () => `"cats.jpg"`;
const inputsAudioToAudio = () => `"sample1.flac"`;
const inputsAudioClassification = () => `"sample1.flac"`;
const inputsTextToImage = () => `"Astronaut riding a horse"`;
const inputsTextToVideo = () => `"A young man walking on the street"`;
const inputsTextToSpeech = () => `"The answer to the universe is 42"`;
const inputsTextToAudio = () => `"liquid drum and bass, atmospheric synths, airy sounds"`;
const inputsAutomaticSpeechRecognition = () => `"sample1.flac"`;
const inputsTabularPrediction = () => `'{"Height":[11.52,12.48],"Length1":[23.2,24.0],"Length2":[25.4,26.3],"Species": ["Bream","Bream"]}'`;
const inputsZeroShotImageClassification = () => `"cats.jpg"`;
const modelInputSnippets = {
    "audio-to-audio": inputsAudioToAudio,
    "audio-classification": inputsAudioClassification,
    "automatic-speech-recognition": inputsAutomaticSpeechRecognition,
    "document-question-answering": inputsVisualQuestionAnswering,
    "feature-extraction": inputsFeatureExtraction,
    "fill-mask": inputsFillMask,
    "image-classification": inputsImageClassification,
    "image-to-text": inputsImageToText,
    "image-to-image": inputsImageToImage,
    "image-to-video": inputsImageToVideo,
    "image-segmentation": inputsImageSegmentation,
    "object-detection": inputsObjectDetection,
    "question-answering": inputsQuestionAnswering,
    "sentence-similarity": inputsSentenceSimilarity,
    summarization: inputsSummarization,
    "table-question-answering": inputsTableQuestionAnswering,
    "tabular-regression": inputsTabularPrediction,
    "tabular-classification": inputsTabularPrediction,
    "text-classification": inputsTextClassification,
    "text-generation": inputsTextGeneration,
    "image-text-to-text": inputsTextGeneration,
    "text-to-image": inputsTextToImage,
    "text-to-video": inputsTextToVideo,
    "text-to-speech": inputsTextToSpeech,
    "text-to-audio": inputsTextToAudio,
    "token-classification": inputsTokenClassification,
    translation: inputsTranslation,
    "zero-shot-classification": inputsZeroShotClassification,
    "zero-shot-image-classification": inputsZeroShotImageClassification,
};
// Use noWrap to put the whole snippet on a single line (removing new lines and tabulations)
// Use noQuotes to strip quotes from start & end (example: "abc" -> abc)
export function getModelInputSnippet(model, noWrap = false, noQuotes = false) {
    if (model.pipeline_tag) {
        const inputs = modelInputSnippets[model.pipeline_tag];
        if (inputs) {
            let result = inputs(model);
            if (typeof result === "string") {
                if (noWrap) {
                    result = result.replace(/(?:(?:\r?\n|\r)\t*)|\t+/g, " ");
                }
                if (noQuotes) {
                    const REGEX_QUOTES = /^"(.+)"$/s;
                    const match = result.match(REGEX_QUOTES);
                    result = match ? match[1] : result;
                }
            }
            return result;
        }
    }
    return "No input example has been defined for this model task.";
}
