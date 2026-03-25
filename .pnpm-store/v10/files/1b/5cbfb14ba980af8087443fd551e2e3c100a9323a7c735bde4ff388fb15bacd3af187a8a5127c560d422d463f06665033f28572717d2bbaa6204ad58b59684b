/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function e(e){const t=new WeakMap;return{postMessage:e.postMessage.bind(e),addEventListener:(s,n)=>{const a=e=>{"handleEvent"in n?n.handleEvent({data:e}):n({data:e})};e.on("message",a),t.set(n,a)},removeEventListener:(s,n)=>{const a=t.get(n);a&&(e.off("message",a),t.delete(n))},start:e.start&&e.start.bind(e)}}export{e as default};
//# sourceMappingURL=node-adapter.min.mjs.map
