import type { TaskDataCustom } from "../index.js";

const taskData: TaskDataCustom = {
	datasets: [
		{
			description: "A curation of widely used datasets for Data Driven Deep Reinforcement Learning (D4RL)",
			id: "edbeeching/decision_transformer_gym_replay",
		},
	],
	demo: {
		inputs: [
			{
				label: "State",
				content: "Red traffic light, pedestrians are about to pass.",
				type: "text",
			},
		],
		outputs: [
			{
				label: "Action",
				content: "Stop the car.",
				type: "text",
			},
			{
				label: "Next State",
				content: "Yellow light, pedestrians have crossed.",
				type: "text",
			},
		],
	},
	metrics: [
		{
			description:
				"Accumulated reward across all time steps discounted by a factor that ranges between 0 and 1 and determines how much the agent optimizes for future relative to immediate rewards. Measures how good is the policy ultimately found by a given algorithm considering uncertainty over the future.",
			id: "Discounted Total Reward",
		},
		{
			description:
				"Average return obtained after running the policy for a certain number of evaluation episodes. As opposed to total reward, mean reward considers how much reward a given algorithm receives while learning.",
			id: "Mean Reward",
		},
		{
			description:
				"Measures how good a given algorithm is after a predefined time. Some algorithms may be guaranteed to converge to optimal behavior across many time steps. However, an agent that reaches an acceptable level of optimality after a given time horizon may be preferable to one that ultimately reaches optimality but takes a long time.",
			id: "Level of Performance After Some Time",
		},
	],
	models: [
		{
			description: "A Reinforcement Learning model trained on expert data from the Gym Hopper environment",

			id: "edbeeching/decision-transformer-gym-hopper-expert",
		},
		{
			description: "A PPO agent playing seals/CartPole-v0 using the stable-baselines3 library and the RL Zoo.",
			id: "HumanCompatibleAI/ppo-seals-CartPole-v0",
		},
	],
	spaces: [
		{
			description: "An application for a cute puppy agent learning to catch a stick.",
			id: "ThomasSimonini/Huggy",
		},
		{
			description: "An application to play Snowball Fight with a reinforcement learning agent.",
			id: "ThomasSimonini/SnowballFight",
		},
	],
	summary:
		"Reinforcement learning is the computational approach of learning from action by interacting with an environment through trial and error and receiving rewards (negative or positive) as feedback",
	widgetModels: [],
	youtubeId: "q0BiUn5LiBc",
};

export default taskData;
