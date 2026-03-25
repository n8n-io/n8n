import type { TaskDataCustom } from "../index.js";

const taskData: TaskDataCustom = {
	datasets: [
		{
			description: "Widely used benchmark dataset for multiple Vision tasks.",
			id: "merve/coco2017",
		},
		{
			description: "Medical Imaging dataset of the Human Brain for segmentation and mask generating tasks",
			id: "rocky93/BraTS_segmentation",
		},
	],
	demo: {
		inputs: [
			{
				filename: "mask-generation-input.png",
				type: "img",
			},
		],
		outputs: [
			{
				filename: "mask-generation-output.png",
				type: "img",
			},
		],
	},
	metrics: [
		{
			description: "IoU is used to measure the overlap between predicted mask and the ground truth mask.",
			id: "Intersection over Union (IoU)",
		},
	],
	models: [
		{
			description: "Small yet powerful mask generation model.",
			id: "Zigeng/SlimSAM-uniform-50",
		},
		{
			description: "Very strong mask generation model.",
			id: "facebook/sam2-hiera-large",
		},
	],
	spaces: [
		{
			description:
				"An application that combines a mask generation model with a zero-shot object detection model for text-guided image segmentation.",
			id: "merve/OWLSAM2",
		},
		{
			description: "An application that compares the performance of a large and a small mask generation model.",
			id: "merve/slimsam",
		},
		{
			description: "An application based on an improved mask generation model.",
			id: "SkalskiP/segment-anything-model-2",
		},
		{
			description: "An application to remove objects from videos using mask generation models.",
			id: "SkalskiP/SAM_and_ProPainter",
		},
	],
	summary:
		"Mask generation is the task of generating masks that identify a specific object or region of interest in a given image. Masks are often used in segmentation tasks, where they provide a precise way to isolate the object of interest for further processing or analysis.",
	widgetModels: [],
	youtubeId: "",
};

export default taskData;
