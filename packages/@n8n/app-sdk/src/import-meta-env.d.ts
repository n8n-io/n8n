// Vite injects `import.meta.env.BASE_URL` and `VITE_*` vars at build time. The shape is
// declared here so the SDK needs neither `vite/client` nor a global that would clash with
// the app's own.
interface ImportMeta {
	readonly env?: { readonly BASE_URL?: string; readonly VITE_N8N_API_BASE?: string };
}
