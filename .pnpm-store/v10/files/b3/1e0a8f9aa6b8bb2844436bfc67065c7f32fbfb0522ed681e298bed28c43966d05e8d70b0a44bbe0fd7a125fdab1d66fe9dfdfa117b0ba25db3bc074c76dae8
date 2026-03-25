import { selectorEngine, getByTitleSelector, getByTextSelector, getByPlaceholderSelector, getByAltTextSelector, getByTestIdSelector, getByRoleSelector, getByLabelSelector, Locator, processTimeoutOptions, getIframeScale } from '@vitest/browser/locators';
import { page, server } from 'vitest/browser';
import { __INTERNAL } from 'vitest/internal/browser';

class PlaywrightLocator extends Locator {
	constructor(selector, _container) {
		super();
		this.selector = selector;
		this._container = _container;
	}
	click(options) {
		return super.click(processTimeoutOptions(processClickOptions(options)));
	}
	dblClick(options) {
		return super.dblClick(processTimeoutOptions(processClickOptions(options)));
	}
	tripleClick(options) {
		return super.tripleClick(processTimeoutOptions(processClickOptions(options)));
	}
	selectOptions(value, options) {
		return super.selectOptions(value, processTimeoutOptions(options));
	}
	clear(options) {
		return super.clear(processTimeoutOptions(options));
	}
	hover(options) {
		return super.hover(processTimeoutOptions(processHoverOptions(options)));
	}
	upload(files, options) {
		return super.upload(files, processTimeoutOptions(options));
	}
	fill(text, options) {
		return super.fill(text, processTimeoutOptions(options));
	}
	dropTo(target, options) {
		return super.dropTo(target, processTimeoutOptions(processDragAndDropOptions(options)));
	}
	locator(selector) {
		return new PlaywrightLocator(`${this.selector} >> ${selector}`, this._container);
	}
	elementLocator(element) {
		return new PlaywrightLocator(selectorEngine.generateSelectorSimple(element), element);
	}
}
page.extend({
	getByLabelText(text, options) {
		return new PlaywrightLocator(getByLabelSelector(text, options));
	},
	getByRole(role, options) {
		return new PlaywrightLocator(getByRoleSelector(role, options));
	},
	getByTestId(testId) {
		return new PlaywrightLocator(getByTestIdSelector(server.config.browser.locators.testIdAttribute, testId));
	},
	getByAltText(text, options) {
		return new PlaywrightLocator(getByAltTextSelector(text, options));
	},
	getByPlaceholder(text, options) {
		return new PlaywrightLocator(getByPlaceholderSelector(text, options));
	},
	getByText(text, options) {
		return new PlaywrightLocator(getByTextSelector(text, options));
	},
	getByTitle(title, options) {
		return new PlaywrightLocator(getByTitleSelector(title, options));
	},
	elementLocator(element) {
		return new PlaywrightLocator(selectorEngine.generateSelectorSimple(element), element);
	},
	frameLocator(locator) {
		return new PlaywrightLocator(`${locator.selector} >> internal:control=enter-frame`);
	}
});
__INTERNAL._createLocator = (selector) => new PlaywrightLocator(selector);
function processDragAndDropOptions(options) {
	if (!options) {
		return options;
	}
	if (options.sourcePosition) {
		options.sourcePosition = processPlaywrightPosition(options.sourcePosition);
	}
	if (options.targetPosition) {
		options.targetPosition = processPlaywrightPosition(options.targetPosition);
	}
	return options;
}
function processHoverOptions(options) {
	if (!options) {
		return options;
	}
	if (options.position) {
		options.position = processPlaywrightPosition(options.position);
	}
	return options;
}
function processClickOptions(options) {
	if (!options) {
		return options;
	}
	if (options.position) {
		options.position = processPlaywrightPosition(options.position);
	}
	return options;
}
function processPlaywrightPosition(position) {
	const scale = getIframeScale();
	if (position.x != null) {
		position.x *= scale;
	}
	if (position.y != null) {
		position.y *= scale;
	}
	return position;
}
