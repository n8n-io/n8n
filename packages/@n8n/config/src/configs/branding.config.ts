import { Config, Env } from '../decorators';

@Config
export class BrandingConfig {
	/**
	 * Absolute path to a CSS file whose contents are injected into a `<style>` tag
	 * in the served `index.html`. Useful for OEM/white-label deployments that need
	 * to override design-system CSS variables (e.g. brand colors). When both this
	 * and `N8N_CUSTOM_CSS` are set, the file's contents take precedence.
	 */
	@Env('N8N_CUSTOM_CSS_PATH')
	customCssPath: string = '';

	/**
	 * Inline CSS string injected into a `<style>` tag in the served `index.html`.
	 * Convenience for short overrides; for non-trivial CSS prefer
	 * `N8N_CUSTOM_CSS_PATH`. Ignored when `N8N_CUSTOM_CSS_PATH` is set and readable.
	 */
	@Env('N8N_CUSTOM_CSS')
	customCss: string = '';
}
