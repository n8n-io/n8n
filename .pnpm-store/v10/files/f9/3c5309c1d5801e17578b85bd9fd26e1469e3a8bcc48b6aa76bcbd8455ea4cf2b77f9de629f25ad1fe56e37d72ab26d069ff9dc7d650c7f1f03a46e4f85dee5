export default function(n){return{all:n=n||new Map,on:function(t,e){var i=n.get(t);i&&i.push(e)||n.set(t,[e])},off:function(t,e){var i=n.get(t);i&&i.splice(i.indexOf(e)>>>0,1)},emit:function(t,e){(n.get(t)||[]).slice().map(function(n){n(e)}),(n.get("*")||[]).slice().map(function(n){n(t,e)})}}}
//# sourceMappingURL=mitt.es.js.map
