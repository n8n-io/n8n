module.exports=function(n){return{all:n=n||new Map,on:function(e,t){var i=n.get(e);i&&i.push(t)||n.set(e,[t])},off:function(e,t){var i=n.get(e);i&&i.splice(i.indexOf(t)>>>0,1)},emit:function(e,t){(n.get(e)||[]).slice().map(function(n){n(t)}),(n.get("*")||[]).slice().map(function(n){n(e,t)})}}};
//# sourceMappingURL=mitt.js.map
