/**
 * Placeholder that the frontend build bakes into the `<script>` tags of the built HTML
 * (see the `csp-nonce` Vite plugin), for the backend to replace with the request's nonce
 * when it serves the page. Shared so the two sides cannot drift apart.
 */
export const HTML_NONCE_PLACEHOLDER = '{{CSP_NONCE}}';
