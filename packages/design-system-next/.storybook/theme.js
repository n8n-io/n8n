import { create } from "@storybook/theming";

const commonConfig = {
	brandTitle: "n8n",
	brandUrl: "https://n8n.io",
};

export const light = create({
	base: "light",
	brandImage: "/assets/images/storybook-logo-light.png",
	...commonConfig,
});

export const dark = create({
	base: "dark",
	brandImage: "/assets/images/storybook-logo-dark.png",
	...commonConfig,
});
