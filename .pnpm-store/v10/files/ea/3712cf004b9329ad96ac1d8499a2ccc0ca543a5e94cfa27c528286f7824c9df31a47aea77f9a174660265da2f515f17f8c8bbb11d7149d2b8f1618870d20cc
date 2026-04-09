import type { TaskDataCustom } from "../index.js";

const taskData: TaskDataCustom = {
	datasets: [],
	demo: {
		inputs: [
			{
				filename: "image-text-to-image-input.jpeg",
				type: "img",
			},
			{
				label: "Input",
				content: "A city above clouds, pastel colors, Victorian style",
				type: "text",
			},
		],
		outputs: [
			{
				filename: "image-text-to-image-output.png",
				type: "img",
			},
		],
	},
	metrics: [
		{
			description:
				"The Fréchet Inception Distance (FID) calculates the distance between distributions between synthetic and real samples. A lower FID score indicates better similarity between the distributions of real and generated images.",
			id: "FID",
		},
		{
			description:
				"CLIP Score measures the similarity between the generated image and the text prompt using CLIP embeddings. A higher score indicates better alignment with the text prompt.",
			id: "CLIP",
		},
	],
	models: [
		{
			description: "A powerful model for image-text-to-image generation.",
			id: "black-forest-labs/FLUX.2-dev",
		},
	],
	spaces: [
		{
			description: "An application for image-text-to-image generation.",
			id: "black-forest-labs/FLUX.2-dev",
		},
	],
	summary:
		"Image-text-to-image models take an image and a text prompt as input and generate a new image based on the reference image and text instructions. These models are useful for image editing, style transfer, image variations, and guided image generation tasks.",
	widgetModels: ["black-forest-labs/FLUX.2-dev"],
	youtubeId: undefined,
};

export default taskData;
