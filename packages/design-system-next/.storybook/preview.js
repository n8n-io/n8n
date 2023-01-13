import "../src/n8n.scss";
import "./preview.scss";

import addons from "@storybook/addons";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { app } from "@storybook/vue3";
import { light, dark } from "./theme";
import { N8nDesignSystem, components } from "../src/n8n";

library.add(fas);

app.use(N8nDesignSystem, {
	components,
});

addons.getChannel().on("DARK_MODE", (isDarkMode) => {
	app.config.globalProperties.$n8n.options.colorMode = isDarkMode
		? "dark"
		: "light";
});

export const parameters = {
	actions: {
		argTypesRegex: "^on[A-Z].*",
	},
	controls: {
		matchers: {
			date: /Date$/,
		},
	},
	darkMode: {
		stylePreview: true,
		dark,
		light,
	},
};
