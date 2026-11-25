//#region ../../../node_modules/.pnpm/@pinecone-database+connect@0.0.4/node_modules/@pinecone-database/connect/dist/index.js
function w(e, t, n) {
	const o = ({ data: s, source: r, origin: c }) => {
		!t(c) || !r || s.action === e && n(s, r, c);
	};
	return window.addEventListener("message", o), () => window.removeEventListener("message", o);
}
function f(e, t, n) {
	const o = ({ data: s, source: r, origin: c }) => {
		!t(c) || !r || s.action === e && (window.removeEventListener("message", o), n(s, r, c));
	};
	return window.addEventListener("message", o), () => window.removeEventListener("message", o);
}
function C(e, t, n, o) {
	return w(e, n, (s, r, c) => {
		const d = o == null ? void 0 : o(s);
		r.postMessage({
			action: t,
			...d
		}, { targetOrigin: c });
	});
}
var i = /* @__PURE__ */ ((e) => (e.ACK = "ack", e.API_KEY = "api_key", e.CANCEL = "cancel", e.CONNECTION_INFO = "connection_info", e.READY = "ready", e))(i || {});
var m = "https://app.pinecone.io";
var l = 600;
var u = 650;
function O(e) {
	const t = (window.screen.width - l) / 2 + (window.screenLeft ?? window.screenX ?? 0), n = (window.screen.height - u) / 2 + (window.screenTop ?? window.screenY ?? 0);
	window.open(`${m}/connect/${e}`, "_blank", `width=${l},height=${u},left=${t},top=${n}`);
}
function p(e) {
	return e === m;
}
function N({ onConnect: e = () => {}, onCancel: t = () => {}, integrationId: n }) {
	const o = C(i.READY, i.ACK, p), s = f(i.CONNECTION_INFO, p, e), r = w(i.CANCEL, p, t);
	return {
		open: () => O(n),
		cleanup: () => {
			o(), s(), r();
		}
	};
}
//#endregion
export { N as ConnectPopup };
