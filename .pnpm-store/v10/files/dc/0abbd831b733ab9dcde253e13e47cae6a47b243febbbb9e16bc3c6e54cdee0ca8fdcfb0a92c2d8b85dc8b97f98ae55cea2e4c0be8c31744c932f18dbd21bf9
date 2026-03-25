import type { TaskDataCustom } from "../index.js";

const taskData: TaskDataCustom = {
	datasets: [
		{
			description: "RedCaps is a large-scale dataset of 12M image-text pairs collected from Reddit.",
			id: "red_caps",
		},
		{
			description: "Conceptual Captions is a dataset consisting of ~3.3M images annotated with captions.",
			id: "conceptual_captions",
		},
		{
			description: "12M image-caption pairs.",
			id: "Spawning/PD12M",
		},
	],
	demo: {
		inputs: [
			{
				label: "Input",
				content: "A city above clouds, pastel colors, Victorian style",
				type: "text",
			},
		],
		outputs: [
			{
				filename: "image.jpeg",
				type: "img",
			},
		],
	},
	metrics: [
		{
			description:
				"The Inception Score (IS) measure assesses diversity and meaningfulness. It uses a generated image sample to predict its label. A higher score signifies more diverse and meaningful images.",
			id: "IS",
		},
		{
			description:
				"The Fréchet Inception Distance (FID) calculates the distance between distributions between synthetic and real samples. A lower FID score indicates better similarity between the distributions of real and generated images.",
			id: "FID",
		},
		{
			description:
				"R-precision assesses how the generated image aligns with the provided text description. It uses the generated images as queries to retrieve relevant text descriptions. The top 'r' relevant descriptions are selected and used to calculate R-precision as r/R, where 'R' is the number of ground truth descriptions associated with the generated images. A higher R-precision value indicates a better model.",
			id: "R-Precision",
		},
	],
	models: [
		{
			description: "One of the most powerful image generation models that can generate realistic outputs.",
			id: "black-forest-labs/FLUX.1-dev",
		},
		{
			description: "A powerful yet fast image generation model.",
			id: "latent-consistency/lcm-lora-sdxl",
		},
		{
			description: "Text-to-image model for photorealistic generation.",
			id: "Kwai-Kolors/Kolors",
		},
		{
			description: "A powerful text-to-image model.",
			id: "stabilityai/stable-diffusion-3-medium-diffusers",
		},
	],
	spaces: [
		{
			description: "A powerful text-to-image application.",
			id: "stabilityai/stable-diffusion-3-medium",
		},
		{
			description: "A text-to-image application to generate comics.",
			id: "jbilcke-hf/ai-comic-factory",
		},
		{
			description: "An application to match multiple custom image generation models.",
			id: "multimodalart/flux-lora-lab",
		},
		{
			description: "A powerful yet very fast image generation application.",
			id: "latent-consistency/lcm-lora-for-sdxl",
		},
		{
			description: "A gallery to explore various text-to-image models.",
			id: "multimodalart/LoraTheExplorer",
		},
		{
			description: "An application for `text-to-image`, `image-to-image` and image inpainting.",
			id: "ArtGAN/Stable-Diffusion-ControlNet-WebUI",
		},
		{
			description: "An application to generate realistic images given photos of a person and a prompt.",
			id: "InstantX/InstantID",
		},
	],
	summary:
		"Text-to-image is the task of generating images from input text. These pipelines can also be used to modify and edit images based on text prompts.",
	widgetModels: ["black-forest-labs/FLUX.1-dev"],
	youtubeId: "",
};

export default taskData;
