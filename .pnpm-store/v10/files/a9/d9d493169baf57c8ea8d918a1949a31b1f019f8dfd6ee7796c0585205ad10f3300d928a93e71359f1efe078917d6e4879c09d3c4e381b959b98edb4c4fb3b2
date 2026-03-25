import type { TaskDataCustom } from "../index.js";

const taskData: TaskDataCustom = {
	datasets: [
		{
			description: "A benchmark of 10 different audio tasks.",
			id: "s3prl/superb",
		},
		{
			description: "A dataset of YouTube clips and their sound categories.",
			id: "agkphysics/AudioSet",
		},
	],
	demo: {
		inputs: [
			{
				filename: "audio.wav",
				type: "audio",
			},
		],
		outputs: [
			{
				data: [
					{
						label: "Up",
						score: 0.2,
					},
					{
						label: "Down",
						score: 0.8,
					},
				],
				type: "chart",
			},
		],
	},
	metrics: [
		{
			description: "",
			id: "accuracy",
		},
		{
			description: "",
			id: "recall",
		},
		{
			description: "",
			id: "precision",
		},
		{
			description: "",
			id: "f1",
		},
	],
	models: [
		{
			description: "An easy-to-use model for command recognition.",
			id: "speechbrain/google_speech_command_xvector",
		},
		{
			description: "An emotion recognition model.",
			id: "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition",
		},
		{
			description: "A language identification model.",
			id: "facebook/mms-lid-126",
		},
	],
	spaces: [
		{
			description: "An application that can classify music into different genre.",
			id: "kurianbenoy/audioclassification",
		},
	],
	summary:
		"Audio classification is the task of assigning a label or class to a given audio. It can be used for recognizing which command a user is giving or the emotion of a statement, as well as identifying a speaker.",
	widgetModels: ["MIT/ast-finetuned-audioset-10-10-0.4593"],
	youtubeId: "KWwzcmG98Ds",
};

export default taskData;
