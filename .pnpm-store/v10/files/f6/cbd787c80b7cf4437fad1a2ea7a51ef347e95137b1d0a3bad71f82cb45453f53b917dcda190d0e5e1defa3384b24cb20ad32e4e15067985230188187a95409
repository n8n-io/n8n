"use strict"
var os=require("os")
var fs=require("fs")
var url=require("url")
var path=require("path")
var SAX=require("@trysound/sax")
var cssSelect=require("css-select")
var csswhat=require("css-what")
var csstree=require("css-tree")
var csso=require("csso")
function _interopNamespaceDefault(e){var n=Object.create(null)
e&&Object.keys(e).forEach((function(k){if(k!=="default"){var d=Object.getOwnPropertyDescriptor(e,k)
Object.defineProperty(n,k,d.get?d:{enumerable:true,get:function(){return e[k]}})}}))
n.default=e
return Object.freeze(n)}var csswhat__namespace=_interopNamespaceDefault(csswhat)
var csstree__namespace=_interopNamespaceDefault(csstree)
var csso__namespace=_interopNamespaceDefault(csso)
const elemsGroups={animation:new Set(["animate","animateColor","animateMotion","animateTransform","set"]),descriptive:new Set(["desc","metadata","title"]),shape:new Set(["circle","ellipse","line","path","polygon","polyline","rect"]),structural:new Set(["defs","g","svg","symbol","use"]),paintServer:new Set(["hatch","linearGradient","meshGradient","pattern","radialGradient","solidColor"]),nonRendering:new Set(["clipPath","filter","linearGradient","marker","mask","pattern","radialGradient","solidColor","symbol"]),container:new Set(["a","defs","foreignObject","g","marker","mask","missing-glyph","pattern","svg","switch","symbol"]),textContent:new Set(["a","altGlyph","altGlyphDef","altGlyphItem","glyph","glyphRef","text","textPath","tref","tspan"]),textContentChild:new Set(["altGlyph","textPath","tref","tspan"]),lightSource:new Set(["feDiffuseLighting","feDistantLight","fePointLight","feSpecularLighting","feSpotLight"]),filterPrimitive:new Set(["feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting","feDisplacementMap","feDropShadow","feFlood","feFuncA","feFuncB","feFuncG","feFuncR","feGaussianBlur","feImage","feMerge","feMergeNode","feMorphology","feOffset","feSpecularLighting","feTile","feTurbulence"])}
const textElems=new Set([...elemsGroups.textContent,"pre","title"])
const pathElems=new Set(["glyph","missing-glyph","path"])
const attrsGroups={animationAddition:new Set(["additive","accumulate"]),animationAttributeTarget:new Set(["attributeType","attributeName"]),animationEvent:new Set(["onbegin","onend","onrepeat","onload"]),animationTiming:new Set(["begin","dur","end","fill","max","min","repeatCount","repeatDur","restart"]),animationValue:new Set(["by","calcMode","from","keySplines","keyTimes","to","values"]),conditionalProcessing:new Set(["requiredExtensions","requiredFeatures","systemLanguage"]),core:new Set(["id","tabindex","xml:base","xml:lang","xml:space"]),graphicalEvent:new Set(["onactivate","onclick","onfocusin","onfocusout","onload","onmousedown","onmousemove","onmouseout","onmouseover","onmouseup"]),presentation:new Set(["alignment-baseline","baseline-shift","clip-path","clip-rule","clip","color-interpolation-filters","color-interpolation","color-profile","color-rendering","color","cursor","direction","display","dominant-baseline","enable-background","fill-opacity","fill-rule","fill","filter","flood-color","flood-opacity","font-family","font-size-adjust","font-size","font-stretch","font-style","font-variant","font-weight","glyph-orientation-horizontal","glyph-orientation-vertical","image-rendering","letter-spacing","lighting-color","marker-end","marker-mid","marker-start","mask","opacity","overflow","paint-order","pointer-events","shape-rendering","stop-color","stop-opacity","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke-width","stroke","text-anchor","text-decoration","text-overflow","text-rendering","transform-origin","transform","unicode-bidi","vector-effect","visibility","word-spacing","writing-mode"]),xlink:new Set(["xlink:actuate","xlink:arcrole","xlink:href","xlink:role","xlink:show","xlink:title","xlink:type"]),documentEvent:new Set(["onabort","onerror","onresize","onscroll","onunload","onzoom"]),documentElementEvent:new Set(["oncopy","oncut","onpaste"]),globalEvent:new Set(["oncancel","oncanplay","oncanplaythrough","onchange","onclick","onclose","oncuechange","ondblclick","ondrag","ondragend","ondragenter","ondragleave","ondragover","ondragstart","ondrop","ondurationchange","onemptied","onended","onerror","onfocus","oninput","oninvalid","onkeydown","onkeypress","onkeyup","onload","onloadeddata","onloadedmetadata","onloadstart","onmousedown","onmouseenter","onmouseleave","onmousemove","onmouseout","onmouseover","onmouseup","onmousewheel","onpause","onplay","onplaying","onprogress","onratechange","onreset","onresize","onscroll","onseeked","onseeking","onselect","onshow","onstalled","onsubmit","onsuspend","ontimeupdate","ontoggle","onvolumechange","onwaiting"]),filterPrimitive:new Set(["x","y","width","height","result"]),transferFunction:new Set(["amplitude","exponent","intercept","offset","slope","tableValues","type"])}
const attrsGroupsDefaults={core:{"xml:space":"default"},presentation:{clip:"auto","clip-path":"none","clip-rule":"nonzero",mask:"none",opacity:"1","stop-color":"#000","stop-opacity":"1","fill-opacity":"1","fill-rule":"nonzero",fill:"#000",stroke:"none","stroke-width":"1","stroke-linecap":"butt","stroke-linejoin":"miter","stroke-miterlimit":"4","stroke-dasharray":"none","stroke-dashoffset":"0","stroke-opacity":"1","paint-order":"normal","vector-effect":"none",display:"inline",visibility:"visible","marker-start":"none","marker-mid":"none","marker-end":"none","color-interpolation":"sRGB","color-interpolation-filters":"linearRGB","color-rendering":"auto","shape-rendering":"auto","text-rendering":"auto","image-rendering":"auto","font-style":"normal","font-variant":"normal","font-weight":"normal","font-stretch":"normal","font-size":"medium","font-size-adjust":"none",kerning:"auto","letter-spacing":"normal","word-spacing":"normal","text-decoration":"none","text-anchor":"start","text-overflow":"clip","writing-mode":"lr-tb","glyph-orientation-vertical":"auto","glyph-orientation-horizontal":"0deg",direction:"ltr","unicode-bidi":"normal","dominant-baseline":"auto","alignment-baseline":"baseline","baseline-shift":"baseline"},transferFunction:{slope:"1",intercept:"0",amplitude:"1",exponent:"1",offset:"0"}}
const attrsGroupsDeprecated={animationAttributeTarget:{unsafe:new Set(["attributeType"])},conditionalProcessing:{unsafe:new Set(["requiredFeatures"])},core:{unsafe:new Set(["xml:base","xml:lang","xml:space"])},presentation:{unsafe:new Set(["clip","color-profile","enable-background","glyph-orientation-horizontal","glyph-orientation-vertical","kerning"])}}
const elems={a:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation","xlink"]),attrs:new Set(["class","externalResourcesRequired","style","target","transform"]),defaults:{target:"_self"},contentGroups:new Set(["animation","descriptive","paintServer","shape","structural"]),content:new Set(["a","altGlyphDef","clipPath","color-profile","cursor","filter","font-face","font","foreignObject","image","marker","mask","pattern","script","style","switch","text","view","tspan"])},altGlyph:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation","xlink"]),attrs:new Set(["class","dx","dy","externalResourcesRequired","format","glyphRef","rotate","style","x","y"])},altGlyphDef:{attrsGroups:new Set(["core"]),content:new Set(["glyphRef"])},altGlyphItem:{attrsGroups:new Set(["core"]),content:new Set(["glyphRef","altGlyphItem"])},animate:{attrsGroups:new Set(["animationAddition","animationAttributeTarget","animationEvent","animationTiming","animationValue","conditionalProcessing","core","presentation","xlink"]),attrs:new Set(["externalResourcesRequired"]),contentGroups:new Set(["descriptive"])},animateColor:{attrsGroups:new Set(["animationAddition","animationAttributeTarget","animationEvent","animationTiming","animationValue","conditionalProcessing","core","presentation","xlink"]),attrs:new Set(["externalResourcesRequired"]),contentGroups:new Set(["descriptive"])},animateMotion:{attrsGroups:new Set(["animationAddition","animationEvent","animationTiming","animationValue","conditionalProcessing","core","xlink"]),attrs:new Set(["externalResourcesRequired","keyPoints","origin","path","rotate"]),defaults:{rotate:"0"},contentGroups:new Set(["descriptive"]),content:new Set(["mpath"])},animateTransform:{attrsGroups:new Set(["animationAddition","animationAttributeTarget","animationEvent","animationTiming","animationValue","conditionalProcessing","core","xlink"]),attrs:new Set(["externalResourcesRequired","type"]),contentGroups:new Set(["descriptive"])},circle:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation"]),attrs:new Set(["class","cx","cy","externalResourcesRequired","r","style","transform"]),defaults:{cx:"0",cy:"0"},contentGroups:new Set(["animation","descriptive"])},clipPath:{attrsGroups:new Set(["conditionalProcessing","core","presentation"]),attrs:new Set(["class","clipPathUnits","externalResourcesRequired","style","transform"]),defaults:{clipPathUnits:"userSpaceOnUse"},contentGroups:new Set(["animation","descriptive","shape"]),content:new Set(["text","use"])},"color-profile":{attrsGroups:new Set(["core","xlink"]),attrs:new Set(["local","name","rendering-intent"]),defaults:{name:"sRGB","rendering-intent":"auto"},deprecated:{unsafe:new Set(["name"])},contentGroups:new Set(["descriptive"])},cursor:{attrsGroups:new Set(["core","conditionalProcessing","xlink"]),attrs:new Set(["externalResourcesRequired","x","y"]),defaults:{x:"0",y:"0"},contentGroups:new Set(["descriptive"])},defs:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation"]),attrs:new Set(["class","externalResourcesRequired","style","transform"]),contentGroups:new Set(["animation","descriptive","paintServer","shape","structural"]),content:new Set(["a","altGlyphDef","clipPath","color-profile","cursor","filter","font-face","font","foreignObject","image","marker","mask","pattern","script","style","switch","text","view"])},desc:{attrsGroups:new Set(["core"]),attrs:new Set(["class","style"])},ellipse:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation"]),attrs:new Set(["class","cx","cy","externalResourcesRequired","rx","ry","style","transform"]),defaults:{cx:"0",cy:"0"},contentGroups:new Set(["animation","descriptive"])},feBlend:{attrsGroups:new Set(["core","presentation","filterPrimitive"]),attrs:new Set(["class","style","in","in2","mode"]),defaults:{mode:"normal"},content:new Set(["animate","set"])},feColorMatrix:{attrsGroups:new Set(["core","presentation","filterPrimitive"]),attrs:new Set(["class","style","in","type","values"]),defaults:{type:"matrix"},content:new Set(["animate","set"])},feComponentTransfer:{attrsGroups:new Set(["core","presentation","filterPrimitive"]),attrs:new Set(["class","style","in"]),content:new Set(["feFuncA","feFuncB","feFuncG","feFuncR"])},feComposite:{attrsGroups:new Set(["core","presentation","filterPrimitive"]),attrs:new Set(["class","in","in2","k1","k2","k3","k4","operator","style"]),defaults:{operator:"over",k1:"0",k2:"0",k3:"0",k4:"0"},content:new Set(["animate","set"])},feConvolveMatrix:{attrsGroups:new Set(["core","presentation","filterPrimitive"]),attrs:new Set(["class","in","kernelMatrix","order","style","bias","divisor","edgeMode","targetX","targetY","kernelUnitLength","preserveAlpha"]),defaults:{order:"3",bias:"0",edgeMode:"duplicate",preserveAlpha:"false"},content:new Set(["animate","set"])},feDiffuseLighting:{attrsGroups:new Set(["core","presentation","filterPrimitive"]),attrs:new Set(["class","diffuseConstant","in","kernelUnitLength","style","surfaceScale"]),defaults:{surfaceScale:"1",diffuseConstant:"1"},contentGroups:new Set(["descriptive"]),content:new Set(["feDistantLight","fePointLight","feSpotLight"])},feDisplacementMap:{attrsGroups:new Set(["core","presentation","filterPrimitive"]),attrs:new Set(["class","in","in2","scale","style","xChannelSelector","yChannelSelector"]),defaults:{scale:"0",xChannelSelector:"A",yChannelSelector:"A"},content:new Set(["animate","set"])},feDistantLight:{attrsGroups:new Set(["core"]),attrs:new Set(["azimuth","elevation"]),defaults:{azimuth:"0",elevation:"0"},content:new Set(["animate","set"])},feFlood:{attrsGroups:new Set(["core","presentation","filterPrimitive"]),attrs:new Set(["class","style"]),content:new Set(["animate","animateColor","set"])},feFuncA:{attrsGroups:new Set(["core","transferFunction"]),content:new Set(["set","animate"])},feFuncB:{attrsGroups:new Set(["core","transferFunction"]),content:new Set(["set","animate"])},feFuncG:{attrsGroups:new Set(["core","transferFunction"]),content:new Set(["set","animate"])},feFuncR:{attrsGroups:new Set(["core","transferFunction"]),content:new Set(["set","animate"])},feGaussianBlur:{attrsGroups:new Set(["core","presentation","filterPrimitive"]),attrs:new Set(["class","style","in","stdDeviation"]),defaults:{stdDeviation:"0"},content:new Set(["set","animate"])},feImage:{attrsGroups:new Set(["core","presentation","filterPrimitive","xlink"]),attrs:new Set(["class","externalResourcesRequired","href","preserveAspectRatio","style","xlink:href"]),defaults:{preserveAspectRatio:"xMidYMid meet"},content:new Set(["animate","animateTransform","set"])},feMerge:{attrsGroups:new Set(["core","presentation","filterPrimitive"]),attrs:new Set(["class","style"]),content:new Set(["feMergeNode"])},feMergeNode:{attrsGroups:new Set(["core"]),attrs:new Set(["in"]),content:new Set(["animate","set"])},feMorphology:{attrsGroups:new Set(["core","presentation","filterPrimitive"]),attrs:new Set(["class","style","in","operator","radius"]),defaults:{operator:"erode",radius:"0"},content:new Set(["animate","set"])},feOffset:{attrsGroups:new Set(["core","presentation","filterPrimitive"]),attrs:new Set(["class","style","in","dx","dy"]),defaults:{dx:"0",dy:"0"},content:new Set(["animate","set"])},fePointLight:{attrsGroups:new Set(["core"]),attrs:new Set(["x","y","z"]),defaults:{x:"0",y:"0",z:"0"},content:new Set(["animate","set"])},feSpecularLighting:{attrsGroups:new Set(["core","presentation","filterPrimitive"]),attrs:new Set(["class","in","kernelUnitLength","specularConstant","specularExponent","style","surfaceScale"]),defaults:{surfaceScale:"1",specularConstant:"1",specularExponent:"1"},contentGroups:new Set(["descriptive","lightSource"])},feSpotLight:{attrsGroups:new Set(["core"]),attrs:new Set(["limitingConeAngle","pointsAtX","pointsAtY","pointsAtZ","specularExponent","x","y","z"]),defaults:{x:"0",y:"0",z:"0",pointsAtX:"0",pointsAtY:"0",pointsAtZ:"0",specularExponent:"1"},content:new Set(["animate","set"])},feTile:{attrsGroups:new Set(["core","presentation","filterPrimitive"]),attrs:new Set(["class","style","in"]),content:new Set(["animate","set"])},feTurbulence:{attrsGroups:new Set(["core","presentation","filterPrimitive"]),attrs:new Set(["baseFrequency","class","numOctaves","seed","stitchTiles","style","type"]),defaults:{baseFrequency:"0",numOctaves:"1",seed:"0",stitchTiles:"noStitch",type:"turbulence"},content:new Set(["animate","set"])},filter:{attrsGroups:new Set(["core","presentation","xlink"]),attrs:new Set(["class","externalResourcesRequired","filterRes","filterUnits","height","href","primitiveUnits","style","width","x","xlink:href","y"]),defaults:{primitiveUnits:"userSpaceOnUse",x:"-10%",y:"-10%",width:"120%",height:"120%"},deprecated:{unsafe:new Set(["filterRes"])},contentGroups:new Set(["descriptive","filterPrimitive"]),content:new Set(["animate","set"])},font:{attrsGroups:new Set(["core","presentation"]),attrs:new Set(["class","externalResourcesRequired","horiz-adv-x","horiz-origin-x","horiz-origin-y","style","vert-adv-y","vert-origin-x","vert-origin-y"]),defaults:{"horiz-origin-x":"0","horiz-origin-y":"0"},deprecated:{unsafe:new Set(["horiz-origin-x","horiz-origin-y","vert-adv-y","vert-origin-x","vert-origin-y"])},contentGroups:new Set(["descriptive"]),content:new Set(["font-face","glyph","hkern","missing-glyph","vkern"])},"font-face":{attrsGroups:new Set(["core"]),attrs:new Set(["font-family","font-style","font-variant","font-weight","font-stretch","font-size","unicode-range","units-per-em","panose-1","stemv","stemh","slope","cap-height","x-height","accent-height","ascent","descent","widths","bbox","ideographic","alphabetic","mathematical","hanging","v-ideographic","v-alphabetic","v-mathematical","v-hanging","underline-position","underline-thickness","strikethrough-position","strikethrough-thickness","overline-position","overline-thickness"]),defaults:{"font-style":"all","font-variant":"normal","font-weight":"all","font-stretch":"normal","unicode-range":"U+0-10FFFF","units-per-em":"1000","panose-1":"0 0 0 0 0 0 0 0 0 0",slope:"0"},deprecated:{unsafe:new Set(["accent-height","alphabetic","ascent","bbox","cap-height","descent","hanging","ideographic","mathematical","panose-1","slope","stemh","stemv","unicode-range","units-per-em","v-alphabetic","v-hanging","v-ideographic","v-mathematical","widths","x-height"])},contentGroups:new Set(["descriptive"]),content:new Set(["font-face-src"])},"font-face-format":{attrsGroups:new Set(["core"]),attrs:new Set(["string"]),deprecated:{unsafe:new Set(["string"])}},"font-face-name":{attrsGroups:new Set(["core"]),attrs:new Set(["name"]),deprecated:{unsafe:new Set(["name"])}},"font-face-src":{attrsGroups:new Set(["core"]),content:new Set(["font-face-name","font-face-uri"])},"font-face-uri":{attrsGroups:new Set(["core","xlink"]),attrs:new Set(["href","xlink:href"]),content:new Set(["font-face-format"])},foreignObject:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation"]),attrs:new Set(["class","externalResourcesRequired","height","style","transform","width","x","y"]),defaults:{x:"0",y:"0"}},g:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation"]),attrs:new Set(["class","externalResourcesRequired","style","transform"]),contentGroups:new Set(["animation","descriptive","paintServer","shape","structural"]),content:new Set(["a","altGlyphDef","clipPath","color-profile","cursor","filter","font-face","font","foreignObject","image","marker","mask","pattern","script","style","switch","text","view"])},glyph:{attrsGroups:new Set(["core","presentation"]),attrs:new Set(["arabic-form","class","d","glyph-name","horiz-adv-x","lang","orientation","style","unicode","vert-adv-y","vert-origin-x","vert-origin-y"]),defaults:{"arabic-form":"initial"},deprecated:{unsafe:new Set(["arabic-form","glyph-name","horiz-adv-x","orientation","unicode","vert-adv-y","vert-origin-x","vert-origin-y"])},contentGroups:new Set(["animation","descriptive","paintServer","shape","structural"]),content:new Set(["a","altGlyphDef","clipPath","color-profile","cursor","filter","font-face","font","foreignObject","image","marker","mask","pattern","script","style","switch","text","view"])},glyphRef:{attrsGroups:new Set(["core","presentation"]),attrs:new Set(["class","d","horiz-adv-x","style","vert-adv-y","vert-origin-x","vert-origin-y"]),deprecated:{unsafe:new Set(["horiz-adv-x","vert-adv-y","vert-origin-x","vert-origin-y"])},contentGroups:new Set(["animation","descriptive","paintServer","shape","structural"]),content:new Set(["a","altGlyphDef","clipPath","color-profile","cursor","filter","font-face","font","foreignObject","image","marker","mask","pattern","script","style","switch","text","view"])},hatch:{attrsGroups:new Set(["core","presentation","xlink"]),attrs:new Set(["class","hatchContentUnits","hatchUnits","pitch","rotate","style","transform","x","y"]),defaults:{hatchUnits:"objectBoundingBox",hatchContentUnits:"userSpaceOnUse",x:"0",y:"0",pitch:"0",rotate:"0"},contentGroups:new Set(["animation","descriptive"]),content:new Set(["hatchPath"])},hatchPath:{attrsGroups:new Set(["core","presentation","xlink"]),attrs:new Set(["class","style","d","offset"]),defaults:{offset:"0"},contentGroups:new Set(["animation","descriptive"])},hkern:{attrsGroups:new Set(["core"]),attrs:new Set(["u1","g1","u2","g2","k"]),deprecated:{unsafe:new Set(["g1","g2","k","u1","u2"])}},image:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation","xlink"]),attrs:new Set(["class","externalResourcesRequired","height","href","preserveAspectRatio","style","transform","width","x","xlink:href","y"]),defaults:{x:"0",y:"0",preserveAspectRatio:"xMidYMid meet"},contentGroups:new Set(["animation","descriptive"])},line:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation"]),attrs:new Set(["class","externalResourcesRequired","style","transform","x1","x2","y1","y2"]),defaults:{x1:"0",y1:"0",x2:"0",y2:"0"},contentGroups:new Set(["animation","descriptive"])},linearGradient:{attrsGroups:new Set(["core","presentation","xlink"]),attrs:new Set(["class","externalResourcesRequired","gradientTransform","gradientUnits","href","spreadMethod","style","x1","x2","xlink:href","y1","y2"]),defaults:{x1:"0",y1:"0",x2:"100%",y2:"0",spreadMethod:"pad"},contentGroups:new Set(["descriptive"]),content:new Set(["animate","animateTransform","set","stop"])},marker:{attrsGroups:new Set(["core","presentation"]),attrs:new Set(["class","externalResourcesRequired","markerHeight","markerUnits","markerWidth","orient","preserveAspectRatio","refX","refY","style","viewBox"]),defaults:{markerUnits:"strokeWidth",refX:"0",refY:"0",markerWidth:"3",markerHeight:"3"},contentGroups:new Set(["animation","descriptive","paintServer","shape","structural"]),content:new Set(["a","altGlyphDef","clipPath","color-profile","cursor","filter","font-face","font","foreignObject","image","marker","mask","pattern","script","style","switch","text","view"])},mask:{attrsGroups:new Set(["conditionalProcessing","core","presentation"]),attrs:new Set(["class","externalResourcesRequired","height","mask-type","maskContentUnits","maskUnits","style","width","x","y"]),defaults:{maskUnits:"objectBoundingBox",maskContentUnits:"userSpaceOnUse",x:"-10%",y:"-10%",width:"120%",height:"120%"},contentGroups:new Set(["animation","descriptive","paintServer","shape","structural"]),content:new Set(["a","altGlyphDef","clipPath","color-profile","cursor","filter","font-face","font","foreignObject","image","marker","mask","pattern","script","style","switch","text","view"])},metadata:{attrsGroups:new Set(["core"])},"missing-glyph":{attrsGroups:new Set(["core","presentation"]),attrs:new Set(["class","d","horiz-adv-x","style","vert-adv-y","vert-origin-x","vert-origin-y"]),deprecated:{unsafe:new Set(["horiz-adv-x","vert-adv-y","vert-origin-x","vert-origin-y"])},contentGroups:new Set(["animation","descriptive","paintServer","shape","structural"]),content:new Set(["a","altGlyphDef","clipPath","color-profile","cursor","filter","font-face","font","foreignObject","image","marker","mask","pattern","script","style","switch","text","view"])},mpath:{attrsGroups:new Set(["core","xlink"]),attrs:new Set(["externalResourcesRequired","href","xlink:href"]),contentGroups:new Set(["descriptive"])},path:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation"]),attrs:new Set(["class","d","externalResourcesRequired","pathLength","style","transform"]),contentGroups:new Set(["animation","descriptive"])},pattern:{attrsGroups:new Set(["conditionalProcessing","core","presentation","xlink"]),attrs:new Set(["class","externalResourcesRequired","height","href","patternContentUnits","patternTransform","patternUnits","preserveAspectRatio","style","viewBox","width","x","xlink:href","y"]),defaults:{patternUnits:"objectBoundingBox",patternContentUnits:"userSpaceOnUse",x:"0",y:"0",width:"0",height:"0",preserveAspectRatio:"xMidYMid meet"},contentGroups:new Set(["animation","descriptive","paintServer","shape","structural"]),content:new Set(["a","altGlyphDef","clipPath","color-profile","cursor","filter","font-face","font","foreignObject","image","marker","mask","pattern","script","style","switch","text","view"])},polygon:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation"]),attrs:new Set(["class","externalResourcesRequired","points","style","transform"]),contentGroups:new Set(["animation","descriptive"])},polyline:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation"]),attrs:new Set(["class","externalResourcesRequired","points","style","transform"]),contentGroups:new Set(["animation","descriptive"])},radialGradient:{attrsGroups:new Set(["core","presentation","xlink"]),attrs:new Set(["class","cx","cy","externalResourcesRequired","fr","fx","fy","gradientTransform","gradientUnits","href","r","spreadMethod","style","xlink:href"]),defaults:{gradientUnits:"objectBoundingBox",cx:"50%",cy:"50%",r:"50%"},contentGroups:new Set(["descriptive"]),content:new Set(["animate","animateTransform","set","stop"])},meshGradient:{attrsGroups:new Set(["core","presentation","xlink"]),attrs:new Set(["class","style","x","y","gradientUnits","transform"]),contentGroups:new Set(["descriptive","paintServer","animation"]),content:new Set(["meshRow"])},meshRow:{attrsGroups:new Set(["core","presentation"]),attrs:new Set(["class","style"]),contentGroups:new Set(["descriptive"]),content:new Set(["meshPatch"])},meshPatch:{attrsGroups:new Set(["core","presentation"]),attrs:new Set(["class","style"]),contentGroups:new Set(["descriptive"]),content:new Set(["stop"])},rect:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation"]),attrs:new Set(["class","externalResourcesRequired","height","rx","ry","style","transform","width","x","y"]),defaults:{x:"0",y:"0"},contentGroups:new Set(["animation","descriptive"])},script:{attrsGroups:new Set(["core","xlink"]),attrs:new Set(["externalResourcesRequired","type","href","xlink:href"])},set:{attrsGroups:new Set(["animation","animationAttributeTarget","animationTiming","conditionalProcessing","core","xlink"]),attrs:new Set(["externalResourcesRequired","to"]),contentGroups:new Set(["descriptive"])},solidColor:{attrsGroups:new Set(["core","presentation"]),attrs:new Set(["class","style"]),contentGroups:new Set(["paintServer"])},stop:{attrsGroups:new Set(["core","presentation"]),attrs:new Set(["class","style","offset","path"]),content:new Set(["animate","animateColor","set"])},style:{attrsGroups:new Set(["core"]),attrs:new Set(["type","media","title"]),defaults:{type:"text/css"}},svg:{attrsGroups:new Set(["conditionalProcessing","core","documentEvent","graphicalEvent","presentation"]),attrs:new Set(["baseProfile","class","contentScriptType","contentStyleType","height","preserveAspectRatio","style","version","viewBox","width","x","y","zoomAndPan"]),defaults:{x:"0",y:"0",width:"100%",height:"100%",preserveAspectRatio:"xMidYMid meet",zoomAndPan:"magnify",version:"1.1",baseProfile:"none",contentScriptType:"application/ecmascript",contentStyleType:"text/css"},deprecated:{safe:new Set(["version"]),unsafe:new Set(["baseProfile","contentScriptType","contentStyleType","zoomAndPan"])},contentGroups:new Set(["animation","descriptive","paintServer","shape","structural"]),content:new Set(["a","altGlyphDef","clipPath","color-profile","cursor","filter","font-face","font","foreignObject","image","marker","mask","pattern","script","style","switch","text","view"])},switch:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation"]),attrs:new Set(["class","externalResourcesRequired","style","transform"]),contentGroups:new Set(["animation","descriptive","shape"]),content:new Set(["a","foreignObject","g","image","svg","switch","text","use"])},symbol:{attrsGroups:new Set(["core","graphicalEvent","presentation"]),attrs:new Set(["class","externalResourcesRequired","preserveAspectRatio","refX","refY","style","viewBox"]),defaults:{refX:"0",refY:"0"},contentGroups:new Set(["animation","descriptive","paintServer","shape","structural"]),content:new Set(["a","altGlyphDef","clipPath","color-profile","cursor","filter","font-face","font","foreignObject","image","marker","mask","pattern","script","style","switch","text","view"])},text:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation"]),attrs:new Set(["class","dx","dy","externalResourcesRequired","lengthAdjust","rotate","style","textLength","transform","x","y"]),defaults:{x:"0",y:"0",lengthAdjust:"spacing"},contentGroups:new Set(["animation","descriptive","textContentChild"]),content:new Set(["a"])},textPath:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation","xlink"]),attrs:new Set(["class","d","externalResourcesRequired","href","method","spacing","startOffset","style","xlink:href"]),defaults:{startOffset:"0",method:"align",spacing:"exact"},contentGroups:new Set(["descriptive"]),content:new Set(["a","altGlyph","animate","animateColor","set","tref","tspan"])},title:{attrsGroups:new Set(["core"]),attrs:new Set(["class","style"])},tref:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation","xlink"]),attrs:new Set(["class","externalResourcesRequired","href","style","xlink:href"]),contentGroups:new Set(["descriptive"]),content:new Set(["animate","animateColor","set"])},tspan:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation"]),attrs:new Set(["class","dx","dy","externalResourcesRequired","lengthAdjust","rotate","style","textLength","x","y"]),contentGroups:new Set(["descriptive"]),content:new Set(["a","altGlyph","animate","animateColor","set","tref","tspan"])},use:{attrsGroups:new Set(["conditionalProcessing","core","graphicalEvent","presentation","xlink"]),attrs:new Set(["class","externalResourcesRequired","height","href","style","transform","width","x","xlink:href","y"]),defaults:{x:"0",y:"0"},contentGroups:new Set(["animation","descriptive"])},view:{attrsGroups:new Set(["core"]),attrs:new Set(["externalResourcesRequired","preserveAspectRatio","viewBox","viewTarget","zoomAndPan"]),deprecated:{unsafe:new Set(["viewTarget","zoomAndPan"])},contentGroups:new Set(["descriptive"])},vkern:{attrsGroups:new Set(["core"]),attrs:new Set(["u1","g1","u2","g2","k"]),deprecated:{unsafe:new Set(["g1","g2","k","u1","u2"])}}}
const editorNamespaces=new Set(["http://creativecommons.org/ns#","http://inkscape.sourceforge.net/DTD/sodipodi-0.dtd","http://ns.adobe.com/AdobeIllustrator/10.0/","http://ns.adobe.com/AdobeSVGViewerExtensions/3.0/","http://ns.adobe.com/Extensibility/1.0/","http://ns.adobe.com/Flows/1.0/","http://ns.adobe.com/GenericCustomNamespace/1.0/","http://ns.adobe.com/Graphs/1.0/","http://ns.adobe.com/ImageReplacement/1.0/","http://ns.adobe.com/SaveForWeb/1.0/","http://ns.adobe.com/Variables/1.0/","http://ns.adobe.com/XPath/1.0/","http://purl.org/dc/elements/1.1/","http://schemas.microsoft.com/visio/2003/SVGExtensions/","http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd","http://taptrix.com/vectorillustrator/svg_extensions","http://www.bohemiancoding.com/sketch/ns","http://www.figma.com/figma/ns","http://www.inkscape.org/namespaces/inkscape","http://www.serif.com/","http://www.vector.evaxdesign.sk","http://www.w3.org/1999/02/22-rdf-syntax-ns#"])
const referencesProps=new Set(["clip-path","color-profile","fill","filter","marker-end","marker-mid","marker-start","mask","stroke","style"])
const inheritableAttrs=new Set(["clip-rule","color-interpolation-filters","color-interpolation","color-profile","color-rendering","color","cursor","direction","dominant-baseline","fill-opacity","fill-rule","fill","font-family","font-size-adjust","font-size","font-stretch","font-style","font-variant","font-weight","font","glyph-orientation-horizontal","glyph-orientation-vertical","image-rendering","letter-spacing","marker-end","marker-mid","marker-start","marker","paint-order","pointer-events","shape-rendering","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke-width","stroke","text-anchor","text-rendering","transform","visibility","word-spacing","writing-mode"])
const presentationNonInheritableGroupAttrs=new Set(["clip-path","display","filter","mask","opacity","text-decoration","transform","unicode-bidi"])
const colorsNames={aliceblue:"#f0f8ff",antiquewhite:"#faebd7",aqua:"#0ff",aquamarine:"#7fffd4",azure:"#f0ffff",beige:"#f5f5dc",bisque:"#ffe4c4",black:"#000",blanchedalmond:"#ffebcd",blue:"#00f",blueviolet:"#8a2be2",brown:"#a52a2a",burlywood:"#deb887",cadetblue:"#5f9ea0",chartreuse:"#7fff00",chocolate:"#d2691e",coral:"#ff7f50",cornflowerblue:"#6495ed",cornsilk:"#fff8dc",crimson:"#dc143c",cyan:"#0ff",darkblue:"#00008b",darkcyan:"#008b8b",darkgoldenrod:"#b8860b",darkgray:"#a9a9a9",darkgreen:"#006400",darkgrey:"#a9a9a9",darkkhaki:"#bdb76b",darkmagenta:"#8b008b",darkolivegreen:"#556b2f",darkorange:"#ff8c00",darkorchid:"#9932cc",darkred:"#8b0000",darksalmon:"#e9967a",darkseagreen:"#8fbc8f",darkslateblue:"#483d8b",darkslategray:"#2f4f4f",darkslategrey:"#2f4f4f",darkturquoise:"#00ced1",darkviolet:"#9400d3",deeppink:"#ff1493",deepskyblue:"#00bfff",dimgray:"#696969",dimgrey:"#696969",dodgerblue:"#1e90ff",firebrick:"#b22222",floralwhite:"#fffaf0",forestgreen:"#228b22",fuchsia:"#f0f",gainsboro:"#dcdcdc",ghostwhite:"#f8f8ff",gold:"#ffd700",goldenrod:"#daa520",gray:"#808080",green:"#008000",greenyellow:"#adff2f",grey:"#808080",honeydew:"#f0fff0",hotpink:"#ff69b4",indianred:"#cd5c5c",indigo:"#4b0082",ivory:"#fffff0",khaki:"#f0e68c",lavender:"#e6e6fa",lavenderblush:"#fff0f5",lawngreen:"#7cfc00",lemonchiffon:"#fffacd",lightblue:"#add8e6",lightcoral:"#f08080",lightcyan:"#e0ffff",lightgoldenrodyellow:"#fafad2",lightgray:"#d3d3d3",lightgreen:"#90ee90",lightgrey:"#d3d3d3",lightpink:"#ffb6c1",lightsalmon:"#ffa07a",lightseagreen:"#20b2aa",lightskyblue:"#87cefa",lightslategray:"#789",lightslategrey:"#789",lightsteelblue:"#b0c4de",lightyellow:"#ffffe0",lime:"#0f0",limegreen:"#32cd32",linen:"#faf0e6",magenta:"#f0f",maroon:"#800000",mediumaquamarine:"#66cdaa",mediumblue:"#0000cd",mediumorchid:"#ba55d3",mediumpurple:"#9370db",mediumseagreen:"#3cb371",mediumslateblue:"#7b68ee",mediumspringgreen:"#00fa9a",mediumturquoise:"#48d1cc",mediumvioletred:"#c71585",midnightblue:"#191970",mintcream:"#f5fffa",mistyrose:"#ffe4e1",moccasin:"#ffe4b5",navajowhite:"#ffdead",navy:"#000080",oldlace:"#fdf5e6",olive:"#808000",olivedrab:"#6b8e23",orange:"#ffa500",orangered:"#ff4500",orchid:"#da70d6",palegoldenrod:"#eee8aa",palegreen:"#98fb98",paleturquoise:"#afeeee",palevioletred:"#db7093",papayawhip:"#ffefd5",peachpuff:"#ffdab9",peru:"#cd853f",pink:"#ffc0cb",plum:"#dda0dd",powderblue:"#b0e0e6",purple:"#800080",rebeccapurple:"#639",red:"#f00",rosybrown:"#bc8f8f",royalblue:"#4169e1",saddlebrown:"#8b4513",salmon:"#fa8072",sandybrown:"#f4a460",seagreen:"#2e8b57",seashell:"#fff5ee",sienna:"#a0522d",silver:"#c0c0c0",skyblue:"#87ceeb",slateblue:"#6a5acd",slategray:"#708090",slategrey:"#708090",snow:"#fffafa",springgreen:"#00ff7f",steelblue:"#4682b4",tan:"#d2b48c",teal:"#008080",thistle:"#d8bfd8",tomato:"#ff6347",turquoise:"#40e0d0",violet:"#ee82ee",wheat:"#f5deb3",white:"#fff",whitesmoke:"#f5f5f5",yellow:"#ff0",yellowgreen:"#9acd32"}
const colorsShortNames={"#f0ffff":"azure","#f5f5dc":"beige","#ffe4c4":"bisque","#a52a2a":"brown","#ff7f50":"coral","#ffd700":"gold","#808080":"gray","#008000":"green","#4b0082":"indigo","#fffff0":"ivory","#f0e68c":"khaki","#faf0e6":"linen","#800000":"maroon","#000080":"navy","#808000":"olive","#ffa500":"orange","#da70d6":"orchid","#cd853f":"peru","#ffc0cb":"pink","#dda0dd":"plum","#800080":"purple","#f00":"red","#ff0000":"red","#fa8072":"salmon","#a0522d":"sienna","#c0c0c0":"silver","#fffafa":"snow","#d2b48c":"tan","#008080":"teal","#ff6347":"tomato","#ee82ee":"violet","#f5deb3":"wheat"}
const colorsProps=new Set(["color","fill","flood-color","lighting-color","stop-color","stroke"])
const pseudoClasses={displayState:new Set(["fullscreen","modal","picture-in-picture"]),input:new Set(["autofill","blank","checked","default","disabled","enabled","in-range","indetermined","invalid","optional","out-of-range","placeholder-shown","read-only","read-write","required","user-invalid","valid"]),linguistic:new Set(["dir","lang"]),location:new Set(["any-link","link","local-link","scope","target-within","target","visited"]),resourceState:new Set(["playing","paused"]),timeDimensional:new Set(["current","past","future"]),treeStructural:new Set(["empty","first-child","first-of-type","last-child","last-of-type","nth-child","nth-last-child","nth-last-of-type","nth-of-type","only-child","only-of-type","root"]),userAction:new Set(["active","focus-visible","focus-within","focus","hover"]),functional:new Set(["is","not","where","has"])}
class SvgoParserError extends Error{constructor(message,line,column,source,file){super(message)
this.name="SvgoParserError"
this.message=`${file||"<input>"}:${line}:${column}: ${message}`
this.reason=message
this.line=line
this.column=column
this.source=source
Error.captureStackTrace&&Error.captureStackTrace(this,SvgoParserError)}toString(){const lines=this.source.split(/\r?\n/)
const startLine=Math.max(this.line-3,0)
const endLine=Math.min(this.line+2,lines.length)
const lineNumberWidth=String(endLine).length
const startColumn=Math.max(this.column-54,0)
const endColumn=Math.max(this.column+20,80)
const code=lines.slice(startLine,endLine).map(((line,index)=>{const lineSlice=line.slice(startColumn,endColumn)
let ellipsisPrefix=""
let ellipsisSuffix=""
startColumn!==0&&(ellipsisPrefix=startColumn>line.length-1?" ":"…")
endColumn<line.length-1&&(ellipsisSuffix="…")
const number=startLine+1+index
const gutter=` ${number.toString().padStart(lineNumberWidth)} | `
if(number===this.line){const gutterSpacing=gutter.replace(/[^|]/g," ")
const lineSpacing=(ellipsisPrefix+line.slice(startColumn,this.column-1)).replace(/[^\t]/g," ")
const spacing=gutterSpacing+lineSpacing
return`>${gutter}${ellipsisPrefix}${lineSlice}${ellipsisSuffix}\n ${spacing}^`}return` ${gutter}${ellipsisPrefix}${lineSlice}${ellipsisSuffix}`})).join("\n")
return`${this.name}: ${this.message}\n\n${code}\n`}}const entityDeclaration=/<!ENTITY\s+(\S+)\s+(?:'([^']+)'|"([^"]+)")\s*>/g
const config={strict:true,trim:false,normalize:false,lowercase:true,xmlns:true,position:true}
const parseSvg=(data,from)=>{const sax=SAX.parser(config.strict,config)
const root={type:"root",children:[]}
let current=root
const stack=[root]
const pushToContent=node=>{Object.defineProperty(node,"parentNode",{writable:true,value:current})
current.children.push(node)}
sax.ondoctype=doctype=>{const node={type:"doctype",name:"svg",data:{doctype:doctype}}
pushToContent(node)
const subsetStart=doctype.indexOf("[")
if(subsetStart>=0){entityDeclaration.lastIndex=subsetStart
let entityMatch=entityDeclaration.exec(data)
while(entityMatch!=null){sax.ENTITIES[entityMatch[1]]=entityMatch[2]||entityMatch[3]
entityMatch=entityDeclaration.exec(data)}}}
sax.onprocessinginstruction=data=>{const node={type:"instruction",name:data.name,value:data.body}
pushToContent(node)}
sax.oncomment=comment=>{const node={type:"comment",value:comment.trim()}
pushToContent(node)}
sax.oncdata=cdata=>{const node={type:"cdata",value:cdata}
pushToContent(node)}
sax.onopentag=data=>{let element={type:"element",name:data.name,attributes:{},children:[]}
for(const[name,attr]of Object.entries(data.attributes))element.attributes[name]=attr.value
pushToContent(element)
current=element
stack.push(element)}
sax.ontext=text=>{if(current.type==="element")if(textElems.has(current.name)){const node={type:"text",value:text}
pushToContent(node)}else if(/\S/.test(text)){const node={type:"text",value:text.trim()}
pushToContent(node)}}
sax.onclosetag=()=>{stack.pop()
current=stack[stack.length-1]}
sax.onerror=e=>{const error=new SvgoParserError(e.reason,e.line+1,e.column,data,from)
if(e.message.indexOf("Unexpected end")===-1)throw error}
sax.write(data).close()
return root}
const encodeEntity=char=>entities[char]
const defaults={doctypeStart:"<!DOCTYPE",doctypeEnd:">",procInstStart:"<?",procInstEnd:"?>",tagOpenStart:"<",tagOpenEnd:">",tagCloseStart:"</",tagCloseEnd:">",tagShortStart:"<",tagShortEnd:"/>",attrStart:'="',attrEnd:'"',commentStart:"\x3c!--",commentEnd:"--\x3e",cdataStart:"<![CDATA[",cdataEnd:"]]>",textStart:"",textEnd:"",indent:4,regEntities:/[&'"<>]/g,regValEntities:/[&"<>]/g,encodeEntity:encodeEntity,pretty:false,useShortTags:true,eol:"lf",finalNewline:false}
const entities={"&":"&amp;","'":"&apos;",'"':"&quot;",">":"&gt;","<":"&lt;"}
const stringifySvg=(data,userOptions={})=>{const config={...defaults,...userOptions}
const indent=config.indent
let newIndent="    "
typeof indent==="number"&&Number.isNaN(indent)===false?newIndent=indent<0?"\t":" ".repeat(indent):typeof indent==="string"&&(newIndent=indent)
const state={indent:newIndent,textContext:null,indentLevel:0}
const eol=config.eol==="crlf"?"\r\n":"\n"
if(config.pretty){config.doctypeEnd+=eol
config.procInstEnd+=eol
config.commentEnd+=eol
config.cdataEnd+=eol
config.tagShortEnd+=eol
config.tagOpenEnd+=eol
config.tagCloseEnd+=eol
config.textEnd+=eol}let svg=stringifyNode(data,config,state)
config.finalNewline&&svg.length>0&&!svg.endsWith("\n")&&(svg+=eol)
return svg}
const stringifyNode=(data,config,state)=>{let svg=""
state.indentLevel+=1
for(const item of data.children){item.type==="element"&&(svg+=stringifyElement(item,config,state))
item.type==="text"&&(svg+=stringifyText(item,config,state))
item.type==="doctype"&&(svg+=stringifyDoctype(item,config))
item.type==="instruction"&&(svg+=stringifyInstruction(item,config))
item.type==="comment"&&(svg+=stringifyComment(item,config))
item.type==="cdata"&&(svg+=stringifyCdata(item,config,state))}state.indentLevel-=1
return svg}
const createIndent=(config,state)=>{let indent=""
config.pretty&&state.textContext==null&&(indent=state.indent.repeat(state.indentLevel-1))
return indent}
const stringifyDoctype=(node,config)=>config.doctypeStart+node.data.doctype+config.doctypeEnd
const stringifyInstruction=(node,config)=>config.procInstStart+node.name+" "+node.value+config.procInstEnd
const stringifyComment=(node,config)=>config.commentStart+node.value+config.commentEnd
const stringifyCdata=(node,config,state)=>createIndent(config,state)+config.cdataStart+node.value+config.cdataEnd
const stringifyElement=(node,config,state)=>{if(node.children.length===0)return config.useShortTags?createIndent(config,state)+config.tagShortStart+node.name+stringifyAttributes(node,config)+config.tagShortEnd:createIndent(config,state)+config.tagShortStart+node.name+stringifyAttributes(node,config)+config.tagOpenEnd+config.tagCloseStart+node.name+config.tagCloseEnd
{let tagOpenStart=config.tagOpenStart
let tagOpenEnd=config.tagOpenEnd
let tagCloseStart=config.tagCloseStart
let tagCloseEnd=config.tagCloseEnd
let openIndent=createIndent(config,state)
let closeIndent=createIndent(config,state)
if(state.textContext){tagOpenStart=defaults.tagOpenStart
tagOpenEnd=defaults.tagOpenEnd
tagCloseStart=defaults.tagCloseStart
tagCloseEnd=defaults.tagCloseEnd
openIndent=""}else if(textElems.has(node.name)){tagOpenEnd=defaults.tagOpenEnd
tagCloseStart=defaults.tagCloseStart
closeIndent=""
state.textContext=node}const children=stringifyNode(node,config,state)
state.textContext===node&&(state.textContext=null)
return openIndent+tagOpenStart+node.name+stringifyAttributes(node,config)+tagOpenEnd+children+closeIndent+tagCloseStart+node.name+tagCloseEnd}}
const stringifyAttributes=(node,config)=>{let attrs=""
for(const[name,value]of Object.entries(node.attributes))if(value!==void 0){const encodedValue=value.toString().replace(config.regValEntities,config.encodeEntity)
attrs+=" "+name+config.attrStart+encodedValue+config.attrEnd}else attrs+=" "+name
return attrs}
const stringifyText=(node,config,state)=>createIndent(config,state)+config.textStart+node.value.replace(config.regEntities,config.encodeEntity)+(state.textContext?"":config.textEnd)
const isTag=node=>node.type==="element"
const existsOne=(test,elems)=>elems.some((elem=>!!isTag(elem)&&(test(elem)||existsOne(test,getChildren(elem)))))
const getAttributeValue=(elem,name)=>elem.attributes[name]
const getChildren=node=>node.children||[]
const getName=elemAst=>elemAst.name
const getParent=node=>node.parentNode||null
const getSiblings=elem=>{var parent=getParent(elem)
return parent?getChildren(parent):[]}
const getText=node=>{if(node.children[0].type==="text"&&node.children[0].type==="cdata")return node.children[0].value
return""}
const hasAttrib=(elem,name)=>elem.attributes[name]!==void 0
const removeSubsets=nodes=>{let idx=nodes.length
let node
let ancestor
let replace
while(--idx>-1){node=ancestor=nodes[idx]
nodes[idx]=null
replace=true
while(ancestor){if(nodes.includes(ancestor)){replace=false
nodes.splice(idx,1)
break}ancestor=getParent(ancestor)}replace&&(nodes[idx]=node)}return nodes}
const findAll=(test,elems)=>{const result=[]
for(const elem of elems)if(isTag(elem)){test(elem)&&result.push(elem)
result.push(...findAll(test,getChildren(elem)))}return result}
const findOne=(test,elems)=>{for(const elem of elems)if(isTag(elem)){if(test(elem))return elem
const result=findOne(test,getChildren(elem))
if(result)return result}return null}
const svgoCssSelectAdapter={isTag:isTag,existsOne:existsOne,getAttributeValue:getAttributeValue,getChildren:getChildren,getName:getName,getParent:getParent,getSiblings:getSiblings,getText:getText,hasAttrib:hasAttrib,removeSubsets:removeSubsets,findAll:findAll,findOne:findOne}
const cssSelectOptions={xmlMode:true,adapter:svgoCssSelectAdapter}
const querySelectorAll=(node,selector)=>cssSelect.selectAll(selector,node,cssSelectOptions)
const querySelector=(node,selector)=>cssSelect.selectOne(selector,node,cssSelectOptions)
const matches=(node,selector)=>cssSelect.is(node,selector,cssSelectOptions)
const visitSkip=Symbol()
const visit=(node,visitor,parentNode)=>{const callbacks=visitor[node.type]
if(callbacks&&callbacks.enter){const symbol=callbacks.enter(node,parentNode)
if(symbol===visitSkip)return}if(node.type==="root")for(const child of node.children)visit(child,visitor,node)
if(node.type==="element"&&parentNode.children.includes(node))for(const child of node.children)visit(child,visitor,node)
callbacks&&callbacks.exit&&callbacks.exit(node,parentNode)}
const detachNodeFromParent=(node,parentNode)=>{parentNode.children=parentNode.children.filter((child=>child!==node))}
const invokePlugins=(ast,info,plugins,overrides,globalOverrides)=>{for(const plugin of plugins){const override=overrides?.[plugin.name]
if(override===false)continue
const params={...plugin.params,...globalOverrides,...override}
const visitor=plugin.fn(ast,params,info)
visitor!=null&&visit(ast,visitor)}}
const createPreset=({name:name,plugins:plugins})=>({name:name,fn:(ast,params,info)=>{const{floatPrecision:floatPrecision,overrides:overrides}=params
const globalOverrides={}
floatPrecision!=null&&(globalOverrides.floatPrecision=floatPrecision)
if(overrides){const pluginNames=plugins.map((({name:name})=>name))
for(const pluginName of Object.keys(overrides))pluginNames.includes(pluginName)||console.warn(`You are trying to configure ${pluginName} which is not part of ${name}.\nTry to put it before or after, for example\n\nplugins: [\n  {\n    name: '${name}',\n  },\n  '${pluginName}'\n]\n`)}invokePlugins(ast,info,plugins,overrides,globalOverrides)}})
const name$Q="removeDoctype"
const description$Q="removes doctype declaration"
const fn$Q=()=>({doctype:{enter:(node,parentNode)=>{detachNodeFromParent(node,parentNode)}}})
var removeDoctype=Object.freeze({__proto__:null,description:description$Q,fn:fn$Q,name:name$Q})
const name$P="removeXMLProcInst"
const description$P="removes XML processing instructions"
const fn$P=()=>({instruction:{enter:(node,parentNode)=>{node.name==="xml"&&detachNodeFromParent(node,parentNode)}}})
var removeXMLProcInst=Object.freeze({__proto__:null,description:description$P,fn:fn$P,name:name$P})
const name$O="removeComments"
const description$O="removes comments"
const DEFAULT_PRESERVE_PATTERNS=[/^!/]
const fn$O=(_root,params)=>{const{preservePatterns:preservePatterns=DEFAULT_PRESERVE_PATTERNS}=params
return{comment:{enter:(node,parentNode)=>{if(preservePatterns){if(!Array.isArray(preservePatterns))throw Error(`Expected array in removeComments preservePatterns parameter but received ${preservePatterns}`)
const matches=preservePatterns.some((pattern=>new RegExp(pattern).test(node.value)))
if(matches)return}detachNodeFromParent(node,parentNode)}}}}
var removeComments=Object.freeze({__proto__:null,description:description$O,fn:fn$O,name:name$O})
const csstreeWalkSkip=csstree__namespace.walk.skip
const parseRule=(ruleNode,dynamic)=>{const declarations=[]
ruleNode.block.children.forEach((cssNode=>{cssNode.type==="Declaration"&&declarations.push({name:cssNode.property,value:csstree__namespace.generate(cssNode.value),important:cssNode.important===true})}))
const rules=[]
csstree__namespace.walk(ruleNode.prelude,(node=>{if(node.type==="Selector"){const newNode=csstree__namespace.clone(node)
let hasPseudoClasses=false
csstree__namespace.walk(newNode,((pseudoClassNode,item,list)=>{if(pseudoClassNode.type==="PseudoClassSelector"){hasPseudoClasses=true
list.remove(item)}}))
rules.push({specificity:csso.syntax.specificity(node),dynamic:hasPseudoClasses||dynamic,selector:csstree__namespace.generate(newNode),declarations:declarations})}}))
return rules}
const parseStylesheet=(css,dynamic)=>{const rules=[]
const ast=csstree__namespace.parse(css,{parseValue:false,parseAtrulePrelude:false})
csstree__namespace.walk(ast,(cssNode=>{if(cssNode.type==="Rule"){rules.push(...parseRule(cssNode,dynamic||false))
return csstreeWalkSkip}if(cssNode.type==="Atrule"){if(cssNode.name==="keyframes"||cssNode.name==="-webkit-keyframes")return csstreeWalkSkip
csstree__namespace.walk(cssNode,(ruleNode=>{if(ruleNode.type==="Rule"){rules.push(...parseRule(ruleNode,dynamic||true))
return csstreeWalkSkip}}))
return csstreeWalkSkip}}))
return rules}
const parseStyleDeclarations=css=>{const declarations=[]
const ast=csstree__namespace.parse(css,{context:"declarationList",parseValue:false})
csstree__namespace.walk(ast,(cssNode=>{cssNode.type==="Declaration"&&declarations.push({name:cssNode.property,value:csstree__namespace.generate(cssNode.value),important:cssNode.important===true})}))
return declarations}
const computeOwnStyle=(stylesheet,node)=>{const computedStyle={}
const importantStyles=new Map
for(const[name,value]of Object.entries(node.attributes))if(attrsGroups.presentation.has(name)){computedStyle[name]={type:"static",inherited:false,value:value}
importantStyles.set(name,false)}for(const{selector:selector,declarations:declarations,dynamic:dynamic}of stylesheet.rules)if(matches(node,selector))for(const{name:name,value:value,important:important}of declarations){const computed=computedStyle[name]
if(computed&&computed.type==="dynamic")continue
if(dynamic){computedStyle[name]={type:"dynamic",inherited:false}
continue}if(computed==null||important===true||importantStyles.get(name)===false){computedStyle[name]={type:"static",inherited:false,value:value}
importantStyles.set(name,important)}}const styleDeclarations=node.attributes.style==null?[]:parseStyleDeclarations(node.attributes.style)
for(const{name:name,value:value,important:important}of styleDeclarations){const computed=computedStyle[name]
if(computed&&computed.type==="dynamic")continue
if(computed==null||important===true||importantStyles.get(name)===false){computedStyle[name]={type:"static",inherited:false,value:value}
importantStyles.set(name,important)}}return computedStyle}
const compareSpecificity=(a,b)=>{for(let i=0;i<4;i+=1){if(a[i]<b[i])return-1
if(a[i]>b[i])return 1}return 0}
const collectStylesheet=root=>{const rules=[]
const parents=new Map
visit(root,{element:{enter:(node,parentNode)=>{parents.set(node,parentNode)
if(node.name!=="style")return
if(node.attributes.type==null||node.attributes.type===""||node.attributes.type==="text/css"){const dynamic=node.attributes.media!=null&&node.attributes.media!=="all"
for(const child of node.children)child.type!=="text"&&child.type!=="cdata"||rules.push(...parseStylesheet(child.value,dynamic))}}}})
rules.sort(((a,b)=>compareSpecificity(a.specificity,b.specificity)))
return{rules:rules,parents:parents}}
const computeStyle=(stylesheet,node)=>{const{parents:parents}=stylesheet
const computedStyles=computeOwnStyle(stylesheet,node)
let parent=parents.get(node)
while(parent!=null&&parent.type!=="root"){const inheritedStyles=computeOwnStyle(stylesheet,parent)
for(const[name,computed]of Object.entries(inheritedStyles))computedStyles[name]==null&&inheritableAttrs.has(name)&&!presentationNonInheritableGroupAttrs.has(name)&&(computedStyles[name]={...computed,inherited:true})
parent=parents.get(parent)}return computedStyles}
const includesAttrSelector=(selector,name,value=null,traversed=false)=>{const selectors=typeof selector==="string"?csswhat__namespace.parse(selector):csswhat__namespace.parse(csstree__namespace.generate(selector.data))
for(const subselector of selectors){const hasAttrSelector=subselector.some(((segment,index)=>{if(traversed){if(index===subselector.length-1)return false
const isNextTraversal=csswhat__namespace.isTraversal(subselector[index+1])
if(!isNextTraversal)return false}if(segment.type!=="attribute"||segment.name!==name)return false
return value==null||segment.value===value}))
if(hasAttrSelector)return true}return false}
const name$N="removeDeprecatedAttrs"
const description$N="removes deprecated attributes"
function extractAttributesInStylesheet(stylesheet){const attributesInStylesheet=new Set
stylesheet.rules.forEach((rule=>{const selectors=csswhat__namespace.parse(rule.selector)
selectors.forEach((subselector=>{subselector.forEach((segment=>{if(segment.type!=="attribute")return
attributesInStylesheet.add(segment.name)}))}))}))
return attributesInStylesheet}function processAttributes(node,deprecatedAttrs,params,attributesInStylesheet){if(!deprecatedAttrs)return
deprecatedAttrs.safe&&deprecatedAttrs.safe.forEach((name=>{if(attributesInStylesheet.has(name))return
delete node.attributes[name]}))
params.removeUnsafe&&deprecatedAttrs.unsafe&&deprecatedAttrs.unsafe.forEach((name=>{if(attributesInStylesheet.has(name))return
delete node.attributes[name]}))}function fn$N(root,params){const stylesheet=collectStylesheet(root)
const attributesInStylesheet=extractAttributesInStylesheet(stylesheet)
return{element:{enter:node=>{const elemConfig=elems[node.name]
if(!elemConfig)return
elemConfig.attrsGroups.has("core")&&node.attributes["xml:lang"]&&!attributesInStylesheet.has("xml:lang")&&node.attributes["lang"]&&delete node.attributes["xml:lang"]
elemConfig.attrsGroups.forEach((attrsGroup=>{processAttributes(node,attrsGroupsDeprecated[attrsGroup],params,attributesInStylesheet)}))
processAttributes(node,elemConfig.deprecated,params,attributesInStylesheet)}}}}var removeDeprecatedAttrs=Object.freeze({__proto__:null,description:description$N,fn:fn$N,name:name$N})
const name$M="removeMetadata"
const description$M="removes <metadata>"
const fn$M=()=>({element:{enter:(node,parentNode)=>{node.name==="metadata"&&detachNodeFromParent(node,parentNode)}}})
var removeMetadata=Object.freeze({__proto__:null,description:description$M,fn:fn$M,name:name$M})
const name$L="removeEditorsNSData"
const description$L="removes editors namespaces, elements and attributes"
const fn$L=(_root,params)=>{let namespaces=[...editorNamespaces]
Array.isArray(params.additionalNamespaces)&&(namespaces=[...editorNamespaces,...params.additionalNamespaces])
const prefixes=[]
return{element:{enter:(node,parentNode)=>{if(node.name==="svg")for(const[name,value]of Object.entries(node.attributes))if(name.startsWith("xmlns:")&&namespaces.includes(value)){prefixes.push(name.slice(6))
delete node.attributes[name]}for(const name of Object.keys(node.attributes))if(name.includes(":")){const[prefix]=name.split(":")
prefixes.includes(prefix)&&delete node.attributes[name]}if(node.name.includes(":")){const[prefix]=node.name.split(":")
prefixes.includes(prefix)&&detachNodeFromParent(node,parentNode)}}}}}
var removeEditorsNSData=Object.freeze({__proto__:null,description:description$L,fn:fn$L,name:name$L})
const name$K="cleanupAttrs"
const description$K="cleanups attributes from newlines, trailing and repeating spaces"
const regNewlinesNeedSpace=/(\S)\r?\n(\S)/g
const regNewlines=/\r?\n/g
const regSpaces=/\s{2,}/g
const fn$K=(root,params)=>{const{newlines:newlines=true,trim:trim=true,spaces:spaces=true}=params
return{element:{enter:node=>{for(const name of Object.keys(node.attributes)){if(newlines){node.attributes[name]=node.attributes[name].replace(regNewlinesNeedSpace,((match,p1,p2)=>p1+" "+p2))
node.attributes[name]=node.attributes[name].replace(regNewlines,"")}trim&&(node.attributes[name]=node.attributes[name].trim())
spaces&&(node.attributes[name]=node.attributes[name].replace(regSpaces," "))}}}}}
var cleanupAttrs=Object.freeze({__proto__:null,description:description$K,fn:fn$K,name:name$K})
const name$J="mergeStyles"
const description$J="merge multiple style elements into one"
const fn$J=()=>{let firstStyleElement=null
let collectedStyles=""
let styleContentType="text"
return{element:{enter:(node,parentNode)=>{if(node.name==="foreignObject")return visitSkip
if(node.name!=="style")return
if(node.attributes.type!=null&&node.attributes.type!==""&&node.attributes.type!=="text/css")return
let css=""
for(const child of node.children){child.type==="text"&&(css+=child.value)
if(child.type==="cdata"){styleContentType="cdata"
css+=child.value}}if(css.trim().length===0){detachNodeFromParent(node,parentNode)
return}if(node.attributes.media==null)collectedStyles+=css
else{collectedStyles+=`@media ${node.attributes.media}{${css}}`
delete node.attributes.media}if(firstStyleElement==null)firstStyleElement=node
else{detachNodeFromParent(node,parentNode)
const child={type:styleContentType,value:collectedStyles}
Object.defineProperty(child,"parentNode",{writable:true,value:firstStyleElement})
firstStyleElement.children=[child]}}}}}
var mergeStyles=Object.freeze({__proto__:null,description:description$J,fn:fn$J,name:name$J})
const name$I="inlineStyles"
const description$I="inline styles (additional options)"
const preservedPseudos=[...pseudoClasses.functional,...pseudoClasses.treeStructural]
const fn$I=(root,params)=>{const{onlyMatchedOnce:onlyMatchedOnce=true,removeMatchedSelectors:removeMatchedSelectors=true,useMqs:useMqs=["","screen"],usePseudos:usePseudos=[""]}=params
const styles=[]
let selectors=[]
return{element:{enter:(node,parentNode)=>{if(node.name==="foreignObject")return visitSkip
if(node.name!=="style"||node.children.length===0)return
if(node.attributes.type!=null&&node.attributes.type!==""&&node.attributes.type!=="text/css")return
const cssText=node.children.filter((child=>child.type==="text"||child.type==="cdata")).map((child=>child.value)).join("")
let cssAst=null
try{cssAst=csstree__namespace.parse(cssText,{parseValue:false,parseCustomProperty:false})}catch{return}cssAst.type==="StyleSheet"&&styles.push({node:node,parentNode:parentNode,cssAst:cssAst})
csstree__namespace.walk(cssAst,{visit:"Rule",enter(node){const atrule=this.atrule
let mediaQuery=""
if(atrule!=null){mediaQuery=atrule.name
atrule.prelude!=null&&(mediaQuery+=` ${csstree__namespace.generate(atrule.prelude)}`)}if(!useMqs.includes(mediaQuery))return
node.prelude.type==="SelectorList"&&node.prelude.children.forEach(((childNode,item)=>{if(childNode.type==="Selector"){const pseudos=[]
childNode.children.forEach(((grandchildNode,grandchildItem,grandchildList)=>{const isPseudo=grandchildNode.type==="PseudoClassSelector"||grandchildNode.type==="PseudoElementSelector"
isPseudo&&!preservedPseudos.includes(grandchildNode.name)&&pseudos.push({item:grandchildItem,list:grandchildList})}))
const pseudoSelectors=csstree__namespace.generate({type:"Selector",children:(new csstree__namespace.List).fromArray(pseudos.map((pseudo=>pseudo.item.data)))})
if(usePseudos.includes(pseudoSelectors))for(const pseudo of pseudos)pseudo.list.remove(pseudo.item)
selectors.push({node:childNode,rule:node,item:item})}}))}})}},root:{exit:()=>{if(styles.length===0)return
const sortedSelectors=selectors.slice().sort(((a,b)=>{const aSpecificity=csso.syntax.specificity(a.item.data)
const bSpecificity=csso.syntax.specificity(b.item.data)
return compareSpecificity(aSpecificity,bSpecificity)})).reverse()
for(const selector of sortedSelectors){const selectorText=csstree__namespace.generate(selector.item.data)
const matchedElements=[]
try{for(const node of querySelectorAll(root,selectorText))node.type==="element"&&matchedElements.push(node)}catch(selectError){continue}if(matchedElements.length===0)continue
if(onlyMatchedOnce&&matchedElements.length>1)continue
for(const selectedEl of matchedElements){const styleDeclarationList=csstree__namespace.parse(selectedEl.attributes.style??"",{context:"declarationList",parseValue:false})
if(styleDeclarationList.type!=="DeclarationList")continue
const styleDeclarationItems=new Map
let firstListItem
csstree__namespace.walk(styleDeclarationList,{visit:"Declaration",enter(node,item){firstListItem==null&&(firstListItem=item)
styleDeclarationItems.set(node.property.toLowerCase(),item)}})
csstree__namespace.walk(selector.rule,{visit:"Declaration",enter(ruleDeclaration){const property=ruleDeclaration.property
attrsGroups.presentation.has(property)&&!selectors.some((selector=>includesAttrSelector(selector.item,property)))&&delete selectedEl.attributes[property]
const matchedItem=styleDeclarationItems.get(property)
const ruleDeclarationItem=styleDeclarationList.children.createItem(ruleDeclaration)
if(matchedItem==null)styleDeclarationList.children.insert(ruleDeclarationItem,firstListItem)
else if(matchedItem.data.important!==true&&ruleDeclaration.important===true){styleDeclarationList.children.replace(matchedItem,ruleDeclarationItem)
styleDeclarationItems.set(property,ruleDeclarationItem)}}})
const newStyles=csstree__namespace.generate(styleDeclarationList)
newStyles.length!==0&&(selectedEl.attributes.style=newStyles)}removeMatchedSelectors&&matchedElements.length!==0&&selector.rule.prelude.type==="SelectorList"&&selector.rule.prelude.children.remove(selector.item)
selector.matchedElements=matchedElements}if(!removeMatchedSelectors)return
for(const selector of sortedSelectors){if(selector.matchedElements==null)continue
if(onlyMatchedOnce&&selector.matchedElements.length>1)continue
for(const selectedEl of selector.matchedElements){const classList=new Set(selectedEl.attributes.class==null?null:selectedEl.attributes.class.split(" "))
for(const child of selector.node.children)child.type!=="ClassSelector"||selectors.some((selector=>includesAttrSelector(selector.item,"class",child.name,true)))||classList.delete(child.name)
classList.size===0?delete selectedEl.attributes.class:selectedEl.attributes.class=Array.from(classList).join(" ")
const firstSubSelector=selector.node.children.first
firstSubSelector?.type!=="IdSelector"||selectedEl.attributes.id!==firstSubSelector.name||selectors.some((selector=>includesAttrSelector(selector.item,"id",firstSubSelector.name,true)))||delete selectedEl.attributes.id}}for(const style of styles){csstree__namespace.walk(style.cssAst,{visit:"Rule",enter:function(node,item,list){node.type==="Rule"&&node.prelude.type==="SelectorList"&&node.prelude.children.isEmpty&&list.remove(item)}})
if(style.cssAst.children.isEmpty)detachNodeFromParent(style.node,style.parentNode)
else{const firstChild=style.node.children[0]
firstChild.type!=="text"&&firstChild.type!=="cdata"||(firstChild.value=csstree__namespace.generate(style.cssAst))}}}}}}
var inlineStyles=Object.freeze({__proto__:null,description:description$I,fn:fn$I,name:name$I})
const regReferencesUrl=/\burl\((["'])?#(.+?)\1\)/g
const regReferencesHref=/^#(.+?)$/
const regReferencesBegin=/(\w+)\.[a-zA-Z]/
const encodeSVGDatauri=(str,type)=>{var prefix="data:image/svg+xml"
if(type&&type!=="base64")type==="enc"?str=prefix+","+encodeURIComponent(str):type==="unenc"&&(str=prefix+","+str)
else{prefix+=";base64,"
str=prefix+Buffer.from(str).toString("base64")}return str}
const cleanupOutData=(data,params,command)=>{let str=""
let delimiter
let prev
data.forEach(((item,i)=>{delimiter=" "
i==0&&(delimiter="")
if(params.noSpaceAfterFlags&&(command=="A"||command=="a")){var pos=i%7
pos!=4&&pos!=5||(delimiter="")}const itemStr=params.leadingZero?removeLeadingZero(item):item.toString()
params.negativeExtraSpace&&delimiter!=""&&(item<0||itemStr.charAt(0)==="."&&prev%1!==0)&&(delimiter="")
prev=item
str+=delimiter+itemStr}))
return str}
const removeLeadingZero=value=>{const strValue=value.toString()
if(0<value&&value<1&&strValue.startsWith("0"))return strValue.slice(1)
if(-1<value&&value<0&&strValue[1]==="0")return strValue[0]+strValue.slice(2)
return strValue}
const hasScripts=node=>{if(node.name==="script"&&node.children.length!==0)return true
if(node.name==="a"){const hasJsLinks=Object.entries(node.attributes).some((([attrKey,attrValue])=>(attrKey==="href"||attrKey.endsWith(":href"))&&attrValue!=null&&attrValue.trimStart().startsWith("javascript:")))
if(hasJsLinks)return true}const eventAttrs=[...attrsGroups.animationEvent,...attrsGroups.documentEvent,...attrsGroups.documentElementEvent,...attrsGroups.globalEvent,...attrsGroups.graphicalEvent]
return eventAttrs.some((attr=>node.attributes[attr]!=null))}
const includesUrlReference=body=>new RegExp(regReferencesUrl).test(body)
const findReferences=(attribute,value)=>{const results=[]
if(referencesProps.has(attribute)){const matches=value.matchAll(regReferencesUrl)
for(const match of matches)results.push(match[2])}if(attribute==="href"||attribute.endsWith(":href")){const match=regReferencesHref.exec(value)
match!=null&&results.push(match[1])}if(attribute==="begin"){const match=regReferencesBegin.exec(value)
match!=null&&results.push(match[1])}return results.map((body=>decodeURI(body)))}
const toFixed=(num,precision)=>{const pow=10**precision
return Math.round(num*pow)/pow}
const name$H="minifyStyles"
const description$H="minifies styles and removes unused styles"
const fn$H=(_root,{usage:usage,...params})=>{const styleElements=new Map
const elementsWithStyleAttributes=[]
const tagsUsage=new Set
const idsUsage=new Set
const classesUsage=new Set
let enableTagsUsage=true
let enableIdsUsage=true
let enableClassesUsage=true
let forceUsageDeoptimized=false
if(typeof usage==="boolean"){enableTagsUsage=usage
enableIdsUsage=usage
enableClassesUsage=usage}else if(usage){enableTagsUsage=usage.tags==null||usage.tags
enableIdsUsage=usage.ids==null||usage.ids
enableClassesUsage=usage.classes==null||usage.classes
forceUsageDeoptimized=usage.force!=null&&usage.force}let deoptimized=false
return{element:{enter:(node,parentNode)=>{hasScripts(node)&&(deoptimized=true)
tagsUsage.add(node.name)
node.attributes.id!=null&&idsUsage.add(node.attributes.id)
if(node.attributes.class!=null)for(const className of node.attributes.class.split(/\s+/))classesUsage.add(className)
node.name==="style"&&node.children.length!==0?styleElements.set(node,parentNode):node.attributes.style!=null&&elementsWithStyleAttributes.push(node)}},root:{exit:()=>{const cssoUsage={}
if(!deoptimized||forceUsageDeoptimized){enableTagsUsage&&(cssoUsage.tags=Array.from(tagsUsage))
enableIdsUsage&&(cssoUsage.ids=Array.from(idsUsage))
enableClassesUsage&&(cssoUsage.classes=Array.from(classesUsage))}for(const[styleNode,styleNodeParent]of styleElements.entries())if(styleNode.children[0].type==="text"||styleNode.children[0].type==="cdata"){const cssText=styleNode.children[0].value
const minified=csso__namespace.minify(cssText,{...params,usage:cssoUsage}).css
if(minified.length===0){detachNodeFromParent(styleNode,styleNodeParent)
continue}if(cssText.indexOf(">")>=0||cssText.indexOf("<")>=0){styleNode.children[0].type="cdata"
styleNode.children[0].value=minified}else{styleNode.children[0].type="text"
styleNode.children[0].value=minified}}for(const node of elementsWithStyleAttributes){const elemStyle=node.attributes.style
node.attributes.style=csso__namespace.minifyBlock(elemStyle,{...params}).css}}}}}
var minifyStyles=Object.freeze({__proto__:null,description:description$H,fn:fn$H,name:name$H})
const name$G="cleanupIds"
const description$G="removes unused IDs and minifies used"
const generateIdChars=["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"]
const maxIdIndex=generateIdChars.length-1
const hasStringPrefix=(string,prefixes)=>{for(const prefix of prefixes)if(string.startsWith(prefix))return true
return false}
const generateId=currentId=>{if(currentId==null)return[0]
currentId[currentId.length-1]+=1
for(let i=currentId.length-1;i>0;i--)if(currentId[i]>maxIdIndex){currentId[i]=0
currentId[i-1]!==void 0&&currentId[i-1]++}if(currentId[0]>maxIdIndex){currentId[0]=0
currentId.unshift(0)}return currentId}
const getIdString=arr=>arr.map((i=>generateIdChars[i])).join("")
const fn$G=(_root,params)=>{const{remove:remove=true,minify:minify=true,preserve:preserve=[],preservePrefixes:preservePrefixes=[],force:force=false}=params
const preserveIds=new Set(Array.isArray(preserve)?preserve:preserve?[preserve]:[])
const preserveIdPrefixes=Array.isArray(preservePrefixes)?preservePrefixes:preservePrefixes?[preservePrefixes]:[]
const nodeById=new Map
const referencesById=new Map
let deoptimized=false
return{element:{enter:node=>{if(!force){if(node.name==="style"&&node.children.length!==0||hasScripts(node)){deoptimized=true
return}if(node.name==="svg"){let hasDefsOnly=true
for(const child of node.children)if(child.type!=="element"||child.name!=="defs"){hasDefsOnly=false
break}if(hasDefsOnly)return visitSkip}}for(const[name,value]of Object.entries(node.attributes))if(name==="id"){const id=value
nodeById.has(id)?delete node.attributes.id:nodeById.set(id,node)}else{const ids=findReferences(name,value)
for(const id of ids){let refs=referencesById.get(id)
if(refs==null){refs=[]
referencesById.set(id,refs)}refs.push({element:node,name:name})}}}},root:{exit:()=>{if(deoptimized)return
const isIdPreserved=id=>preserveIds.has(id)||hasStringPrefix(id,preserveIdPrefixes)
let currentId=null
for(const[id,refs]of referencesById){const node=nodeById.get(id)
if(node!=null){if(minify&&isIdPreserved(id)===false){let currentIdString=null
do{currentId=generateId(currentId)
currentIdString=getIdString(currentId)}while(isIdPreserved(currentIdString)||referencesById.has(currentIdString)&&nodeById.get(currentIdString)==null)
node.attributes.id=currentIdString
for(const{element:element,name:name}of refs){const value=element.attributes[name]
value.includes("#")?element.attributes[name]=value.replace(`#${encodeURI(id)}`,`#${currentIdString}`).replace(`#${id}`,`#${currentIdString}`):element.attributes[name]=value.replace(`${id}.`,`${currentIdString}.`)}}nodeById.delete(id)}}if(remove)for(const[id,node]of nodeById)isIdPreserved(id)===false&&delete node.attributes.id}}}}
var cleanupIds=Object.freeze({__proto__:null,description:description$G,fn:fn$G,name:name$G})
const name$F="removeUselessDefs"
const description$F="removes elements in <defs> without id"
const fn$F=()=>({element:{enter:(node,parentNode)=>{if(node.name==="defs"||elemsGroups.nonRendering.has(node.name)&&node.attributes.id==null){const usefulNodes=[]
collectUsefulNodes(node,usefulNodes)
usefulNodes.length===0&&detachNodeFromParent(node,parentNode)
for(const usefulNode of usefulNodes)Object.defineProperty(usefulNode,"parentNode",{writable:true,value:node})
node.children=usefulNodes}}}})
const collectUsefulNodes=(node,usefulNodes)=>{for(const child of node.children)child.type==="element"&&(child.attributes.id!=null||child.name==="style"?usefulNodes.push(child):collectUsefulNodes(child,usefulNodes))}
var removeUselessDefs=Object.freeze({__proto__:null,description:description$F,fn:fn$F,name:name$F})
const name$E="cleanupNumericValues"
const description$E="rounds numeric values to the fixed precision, removes default ‘px’ units"
const regNumericValues$3=/^([-+]?\d*\.?\d+([eE][-+]?\d+)?)(px|pt|pc|mm|cm|m|in|ft|em|ex|%)?$/
const absoluteLengths$1={cm:96/2.54,mm:96/25.4,in:96,pt:4/3,pc:16,px:1}
const fn$E=(_root,params)=>{const{floatPrecision:floatPrecision=3,leadingZero:leadingZero=true,defaultPx:defaultPx=true,convertToPx:convertToPx=true}=params
return{element:{enter:node=>{if(node.attributes.viewBox!=null){const nums=node.attributes.viewBox.split(/\s,?\s*|,\s*/g)
node.attributes.viewBox=nums.map((value=>{const num=Number(value)
return Number.isNaN(num)?value:Number(num.toFixed(floatPrecision))})).join(" ")}for(const[name,value]of Object.entries(node.attributes)){if(name==="version")continue
const match=value.match(regNumericValues$3)
if(match){let num=Number(Number(match[1]).toFixed(floatPrecision))
let matchedUnit=match[3]||""
let units=matchedUnit
if(convertToPx&&units!==""&&units in absoluteLengths$1){const pxNum=Number((absoluteLengths$1[units]*Number(match[1])).toFixed(floatPrecision))
if(pxNum.toString().length<match[0].length){num=pxNum
units="px"}}let str
str=leadingZero?removeLeadingZero(num):num.toString()
defaultPx&&units==="px"&&(units="")
node.attributes[name]=str+units}}}}}}
var cleanupNumericValues=Object.freeze({__proto__:null,description:description$E,fn:fn$E,name:name$E})
const name$D="convertColors"
const description$D="converts colors: rgb() to #rrggbb and #rrggbb to #rgb"
const rNumber="([+-]?(?:\\d*\\.\\d+|\\d+\\.?)%?)"
const rComma="\\s*,\\s*"
const regRGB=new RegExp("^rgb\\(\\s*"+rNumber+rComma+rNumber+rComma+rNumber+"\\s*\\)$")
const regHEX=/^#(([a-fA-F0-9])\2){3}$/
const convertRgbToHex=([r,g,b])=>{const hexNumber=(256+r<<8|g)<<8|b
return"#"+hexNumber.toString(16).slice(1).toUpperCase()}
const fn$D=(_root,params)=>{const{currentColor:currentColor=false,names2hex:names2hex=true,rgb2hex:rgb2hex=true,convertCase:convertCase="lower",shorthex:shorthex=true,shortname:shortname=true}=params
return{element:{enter:node=>{for(const[name,value]of Object.entries(node.attributes))if(colorsProps.has(name)){let val=value
if(currentColor){let matched
matched=typeof currentColor==="string"?val===currentColor:currentColor instanceof RegExp?currentColor.exec(val)!=null:val!=="none"
matched&&(val="currentcolor")}if(names2hex){const colorName=val.toLowerCase()
colorsNames[colorName]!=null&&(val=colorsNames[colorName])}if(rgb2hex){let match=val.match(regRGB)
if(match!=null){let nums=match.slice(1,4).map((m=>{let n
n=m.indexOf("%")>-1?Math.round(parseFloat(m)*2.55):Number(m)
return Math.max(0,Math.min(n,255))}))
val=convertRgbToHex(nums)}}convertCase&&!includesUrlReference(val)&&(convertCase==="lower"?val=val.toLowerCase():convertCase==="upper"&&(val=val.toUpperCase()))
if(shorthex){let match=regHEX.exec(val)
match!=null&&(val="#"+match[0][1]+match[0][3]+match[0][5])}if(shortname){const colorName=val.toLowerCase()
colorsShortNames[colorName]!=null&&(val=colorsShortNames[colorName])}node.attributes[name]=val}}}}}
var convertColors=Object.freeze({__proto__:null,description:description$D,fn:fn$D,name:name$D})
const name$C="removeUnknownsAndDefaults"
const description$C="removes unknown elements content and attributes, removes attrs with default values"
const allowedChildrenPerElement=new Map
const allowedAttributesPerElement=new Map
const attributesDefaultsPerElement=new Map
for(const[name,config]of Object.entries(elems)){const allowedChildren=new Set
if(config.content)for(const elementName of config.content)allowedChildren.add(elementName)
if(config.contentGroups)for(const contentGroupName of config.contentGroups){const elemsGroup=elemsGroups[contentGroupName]
if(elemsGroup)for(const elementName of elemsGroup)allowedChildren.add(elementName)}const allowedAttributes=new Set
if(config.attrs)for(const attrName of config.attrs)allowedAttributes.add(attrName)
const attributesDefaults=new Map
if(config.defaults)for(const[attrName,defaultValue]of Object.entries(config.defaults))attributesDefaults.set(attrName,defaultValue)
for(const attrsGroupName of config.attrsGroups){const attrsGroup=attrsGroups[attrsGroupName]
if(attrsGroup)for(const attrName of attrsGroup)allowedAttributes.add(attrName)
const groupDefaults=attrsGroupsDefaults[attrsGroupName]
if(groupDefaults)for(const[attrName,defaultValue]of Object.entries(groupDefaults))attributesDefaults.set(attrName,defaultValue)}allowedChildrenPerElement.set(name,allowedChildren)
allowedAttributesPerElement.set(name,allowedAttributes)
attributesDefaultsPerElement.set(name,attributesDefaults)}const fn$C=(root,params)=>{const{unknownContent:unknownContent=true,unknownAttrs:unknownAttrs=true,defaultAttrs:defaultAttrs=true,defaultMarkupDeclarations:defaultMarkupDeclarations=true,uselessOverrides:uselessOverrides=true,keepDataAttrs:keepDataAttrs=true,keepAriaAttrs:keepAriaAttrs=true,keepRoleAttr:keepRoleAttr=false}=params
const stylesheet=collectStylesheet(root)
return{instruction:{enter:node=>{defaultMarkupDeclarations&&(node.value=node.value.replace(/\s*standalone\s*=\s*(["'])no\1/,""))}},element:{enter:(node,parentNode)=>{if(node.name.includes(":"))return
if(node.name==="foreignObject")return visitSkip
if(unknownContent&&parentNode.type==="element"){const allowedChildren=allowedChildrenPerElement.get(parentNode.name)
if(allowedChildren==null||allowedChildren.size===0){if(allowedChildrenPerElement.get(node.name)==null){detachNodeFromParent(node,parentNode)
return}}else if(allowedChildren.has(node.name)===false){detachNodeFromParent(node,parentNode)
return}}const allowedAttributes=allowedAttributesPerElement.get(node.name)
const attributesDefaults=attributesDefaultsPerElement.get(node.name)
const computedParentStyle=parentNode.type==="element"?computeStyle(stylesheet,parentNode):null
for(const[name,value]of Object.entries(node.attributes)){if(keepDataAttrs&&name.startsWith("data-"))continue
if(keepAriaAttrs&&name.startsWith("aria-"))continue
if(keepRoleAttr&&name==="role")continue
if(name==="xmlns")continue
if(name.includes(":")){const[prefix]=name.split(":")
if(prefix!=="xml"&&prefix!=="xlink")continue}unknownAttrs&&allowedAttributes&&allowedAttributes.has(name)===false&&delete node.attributes[name]
defaultAttrs&&node.attributes.id==null&&attributesDefaults&&attributesDefaults.get(name)===value&&computedParentStyle?.[name]==null&&delete node.attributes[name]
if(uselessOverrides&&node.attributes.id==null){const style=computedParentStyle?.[name]
presentationNonInheritableGroupAttrs.has(name)===false&&style!=null&&style.type==="static"&&style.value===value&&delete node.attributes[name]}}}}}}
var removeUnknownsAndDefaults=Object.freeze({__proto__:null,description:description$C,fn:fn$C,name:name$C})
const name$B="removeNonInheritableGroupAttrs"
const description$B="removes non-inheritable group’s presentational attributes"
const fn$B=()=>({element:{enter:node=>{if(node.name==="g")for(const name of Object.keys(node.attributes))!attrsGroups.presentation.has(name)||inheritableAttrs.has(name)||presentationNonInheritableGroupAttrs.has(name)||delete node.attributes[name]}}})
var removeNonInheritableGroupAttrs=Object.freeze({__proto__:null,description:description$B,fn:fn$B,name:name$B})
const name$A="removeUselessStrokeAndFill"
const description$A="removes useless stroke and fill attributes"
const fn$A=(root,params)=>{const{stroke:removeStroke=true,fill:removeFill=true,removeNone:removeNone=false}=params
let hasStyleOrScript=false
visit(root,{element:{enter:node=>{(node.name==="style"||hasScripts(node))&&(hasStyleOrScript=true)}}})
if(hasStyleOrScript)return null
const stylesheet=collectStylesheet(root)
return{element:{enter:(node,parentNode)=>{if(node.attributes.id!=null)return visitSkip
if(!elemsGroups.shape.has(node.name))return
const computedStyle=computeStyle(stylesheet,node)
const stroke=computedStyle.stroke
const strokeOpacity=computedStyle["stroke-opacity"]
const strokeWidth=computedStyle["stroke-width"]
const markerEnd=computedStyle["marker-end"]
const fill=computedStyle.fill
const fillOpacity=computedStyle["fill-opacity"]
const computedParentStyle=parentNode.type==="element"?computeStyle(stylesheet,parentNode):null
const parentStroke=computedParentStyle==null?null:computedParentStyle.stroke
if(removeStroke&&(stroke==null||stroke.type==="static"&&stroke.value=="none"||strokeOpacity!=null&&strokeOpacity.type==="static"&&strokeOpacity.value==="0"||strokeWidth!=null&&strokeWidth.type==="static"&&strokeWidth.value==="0")&&(strokeWidth!=null&&strokeWidth.type==="static"&&strokeWidth.value==="0"||markerEnd==null)){for(const name of Object.keys(node.attributes))name.startsWith("stroke")&&delete node.attributes[name]
parentStroke!=null&&parentStroke.type==="static"&&parentStroke.value!=="none"&&(node.attributes.stroke="none")}if(removeFill&&(fill!=null&&fill.type==="static"&&fill.value==="none"||fillOpacity!=null&&fillOpacity.type==="static"&&fillOpacity.value==="0")){for(const name of Object.keys(node.attributes))name.startsWith("fill-")&&delete node.attributes[name];(fill==null||fill.type==="static"&&fill.value!=="none")&&(node.attributes.fill="none")}removeNone&&(stroke!=null&&node.attributes.stroke!=="none"||(fill==null||fill.type!=="static"||fill.value!=="none")&&node.attributes.fill!=="none"||detachNodeFromParent(node,parentNode))}}}}
var removeUselessStrokeAndFill=Object.freeze({__proto__:null,description:description$A,fn:fn$A,name:name$A})
const name$z="removeViewBox"
const description$z="removes viewBox attribute when possible"
const viewBoxElems=new Set(["pattern","svg","symbol"])
const fn$z=()=>({element:{enter:(node,parentNode)=>{if(viewBoxElems.has(node.name)&&node.attributes.viewBox!=null&&node.attributes.width!=null&&node.attributes.height!=null){if(node.name==="svg"&&parentNode.type!=="root")return
const nums=node.attributes.viewBox.split(/[ ,]+/g)
nums[0]==="0"&&nums[1]==="0"&&node.attributes.width.replace(/px$/,"")===nums[2]&&node.attributes.height.replace(/px$/,"")===nums[3]&&delete node.attributes.viewBox}}}})
var removeViewBox=Object.freeze({__proto__:null,description:description$z,fn:fn$z,name:name$z})
const name$y="cleanupEnableBackground"
const description$y="remove or cleanup enable-background attribute when possible"
const regEnableBackground=/^new\s0\s0\s([-+]?\d*\.?\d+([eE][-+]?\d+)?)\s([-+]?\d*\.?\d+([eE][-+]?\d+)?)$/
const fn$y=root=>{let hasFilter=false
visit(root,{element:{enter:node=>{node.name==="filter"&&(hasFilter=true)}}})
return{element:{enter:node=>{let newStyle=null
let enableBackgroundDeclaration=null
if(node.attributes.style!=null){newStyle=csstree__namespace.parse(node.attributes.style,{context:"declarationList"})
if(newStyle.type==="DeclarationList"){const enableBackgroundDeclarations=[]
csstree__namespace.walk(newStyle,((node,nodeItem)=>{if(node.type==="Declaration"&&node.property==="enable-background"){enableBackgroundDeclarations.push(nodeItem)
enableBackgroundDeclaration=nodeItem}}))
for(let i=0;i<enableBackgroundDeclarations.length-1;i++)newStyle.children.remove(enableBackgroundDeclarations[i])}}if(!hasFilter){delete node.attributes["enable-background"]
if(newStyle?.type==="DeclarationList"){enableBackgroundDeclaration&&newStyle.children.remove(enableBackgroundDeclaration)
newStyle.children.isEmpty?delete node.attributes.style:node.attributes.style=csstree__namespace.generate(newStyle)}return}const hasDimensions=node.attributes.width!=null&&node.attributes.height!=null
if((node.name==="svg"||node.name==="mask"||node.name==="pattern")&&hasDimensions){const attrValue=node.attributes["enable-background"]
const attrCleaned=cleanupValue(attrValue,node.name,node.attributes.width,node.attributes.height)
attrCleaned?node.attributes["enable-background"]=attrCleaned:delete node.attributes["enable-background"]
if(newStyle?.type==="DeclarationList"&&enableBackgroundDeclaration){const styleValue=csstree__namespace.generate(enableBackgroundDeclaration.data.value)
const styleCleaned=cleanupValue(styleValue,node.name,node.attributes.width,node.attributes.height)
styleCleaned?enableBackgroundDeclaration.data.value={type:"Raw",value:styleCleaned}:newStyle.children.remove(enableBackgroundDeclaration)}}newStyle?.type==="DeclarationList"&&(newStyle.children.isEmpty?delete node.attributes.style:node.attributes.style=csstree__namespace.generate(newStyle))}}}}
const cleanupValue=(value,nodeName,width,height)=>{const match=regEnableBackground.exec(value)
if(match!=null&&width===match[1]&&height===match[3])return nodeName==="svg"?void 0:"new"
return value}
var cleanupEnableBackground=Object.freeze({__proto__:null,description:description$y,fn:fn$y,name:name$y})
const argsCountPerCommand={M:2,m:2,Z:0,z:0,L:2,l:2,H:1,h:1,V:1,v:1,C:6,c:6,S:4,s:4,Q:4,q:4,T:2,t:2,A:7,a:7}
const isCommand=c=>c in argsCountPerCommand
const isWsp=c=>{const codePoint=c.codePointAt(0)
return codePoint===0x20||codePoint===0x9||codePoint===0xd||codePoint===0xa}
const isDigit=c=>{const codePoint=c.codePointAt(0)
if(codePoint==null)return false
return 48<=codePoint&&codePoint<=57}
const readNumber=(string,cursor)=>{let i=cursor
let value=""
let state="none"
for(;i<string.length;i+=1){const c=string[i]
if(c==="+"||c==="-"){if(state==="none"){state="sign"
value+=c
continue}if(state==="e"){state="exponent_sign"
value+=c
continue}}if(isDigit(c)){if(state==="none"||state==="sign"||state==="whole"){state="whole"
value+=c
continue}if(state==="decimal_point"||state==="decimal"){state="decimal"
value+=c
continue}if(state==="e"||state==="exponent_sign"||state==="exponent"){state="exponent"
value+=c
continue}}if(c==="."&&(state==="none"||state==="sign"||state==="whole")){state="decimal_point"
value+=c
continue}if((c==="E"||c=="e")&&(state==="whole"||state==="decimal_point"||state==="decimal")){state="e"
value+=c
continue}break}const number=Number.parseFloat(value)
return Number.isNaN(number)?[cursor,null]:[i-1,number]}
const parsePathData=string=>{const pathData=[]
let command=null
let args=[]
let argsCount=0
let canHaveComma=false
let hadComma=false
for(let i=0;i<string.length;i+=1){const c=string.charAt(i)
if(isWsp(c))continue
if(canHaveComma&&c===","){if(hadComma)break
hadComma=true
continue}if(isCommand(c)){if(hadComma)return pathData
if(command==null){if(c!=="M"&&c!=="m")return pathData}else if(args.length!==0)return pathData
command=c
args=[]
argsCount=argsCountPerCommand[command]
canHaveComma=false
argsCount===0&&pathData.push({command:command,args:args})
continue}if(command==null)return pathData
let newCursor=i
let number=null
if(command==="A"||command==="a"){const position=args.length
position!==0&&position!==1||c!=="+"&&c!=="-"&&([newCursor,number]=readNumber(string,i))
position!==2&&position!==5&&position!==6||([newCursor,number]=readNumber(string,i))
if(position===3||position===4){c==="0"&&(number=0)
c==="1"&&(number=1)}}else[newCursor,number]=readNumber(string,i)
if(number==null)return pathData
args.push(number)
canHaveComma=true
hadComma=false
i=newCursor
if(args.length===argsCount){pathData.push({command:command,args:args})
command==="M"&&(command="L")
command==="m"&&(command="l")
args=[]}}return pathData}
const roundAndStringify=(number,precision)=>{precision!=null&&(number=toFixed(number,precision))
return{roundedStr:removeLeadingZero(number),rounded:number}}
const stringifyArgs=(command,args,precision,disableSpaceAfterFlags)=>{let result=""
let previous
for(let i=0;i<args.length;i++){const{roundedStr:roundedStr,rounded:rounded}=roundAndStringify(args[i],precision)
!disableSpaceAfterFlags||command!=="A"&&command!=="a"||i%7!==4&&i%7!==5?i===0||rounded<0?result+=roundedStr:Number.isInteger(previous)||isDigit(roundedStr[0])?result+=` ${roundedStr}`:result+=roundedStr:result+=roundedStr
previous=rounded}return result}
const stringifyPathData=({pathData:pathData,precision:precision,disableSpaceAfterFlags:disableSpaceAfterFlags})=>{if(pathData.length===1){const{command:command,args:args}=pathData[0]
return command+stringifyArgs(command,args,precision,disableSpaceAfterFlags)}let result=""
let prev={...pathData[0]}
pathData[1].command==="L"?prev.command="M":pathData[1].command==="l"&&(prev.command="m")
for(let i=1;i<pathData.length;i++){const{command:command,args:args}=pathData[i]
if(prev.command===command&&prev.command!=="M"&&prev.command!=="m"||prev.command==="M"&&command==="L"||prev.command==="m"&&command==="l"){prev.args=[...prev.args,...args]
i===pathData.length-1&&(result+=prev.command+stringifyArgs(prev.command,prev.args,precision,disableSpaceAfterFlags))}else{result+=prev.command+stringifyArgs(prev.command,prev.args,precision,disableSpaceAfterFlags)
i===pathData.length-1?result+=command+stringifyArgs(command,args,precision,disableSpaceAfterFlags):prev={command:command,args:args}}}return result}
const nonRendering=elemsGroups.nonRendering
const name$x="removeHiddenElems"
const description$x="removes hidden elements (zero sized, with absent attributes)"
const fn$x=(root,params)=>{const{isHidden:isHidden=true,displayNone:displayNone=true,opacity0:opacity0=true,circleR0:circleR0=true,ellipseRX0:ellipseRX0=true,ellipseRY0:ellipseRY0=true,rectWidth0:rectWidth0=true,rectHeight0:rectHeight0=true,patternWidth0:patternWidth0=true,patternHeight0:patternHeight0=true,imageWidth0:imageWidth0=true,imageHeight0:imageHeight0=true,pathEmptyD:pathEmptyD=true,polylineEmptyPoints:polylineEmptyPoints=true,polygonEmptyPoints:polygonEmptyPoints=true}=params
const stylesheet=collectStylesheet(root)
const nonRenderedNodes=new Map
const removedDefIds=new Set
const allDefs=new Map
const allReferences=new Set
const referencesById=new Map
let deoptimized=false
function canRemoveNonRenderingNode(node){if(allReferences.has(node.attributes.id))return false
for(const child of node.children)if(child.type==="element"&&!canRemoveNonRenderingNode(child))return false
return true}function removeElement(node,parentNode){node.type==="element"&&node.attributes.id!=null&&parentNode.type==="element"&&parentNode.name==="defs"&&removedDefIds.add(node.attributes.id)
detachNodeFromParent(node,parentNode)}visit(root,{element:{enter:(node,parentNode)=>{if(nonRendering.has(node.name)){nonRenderedNodes.set(node,parentNode)
return visitSkip}const computedStyle=computeStyle(stylesheet,node)
if(opacity0&&computedStyle.opacity&&computedStyle.opacity.type==="static"&&computedStyle.opacity.value==="0"){if(node.name==="path"){nonRenderedNodes.set(node,parentNode)
return visitSkip}removeElement(node,parentNode)}}}})
return{element:{enter:(node,parentNode)=>{if(node.name==="style"&&node.children.length!==0||hasScripts(node)){deoptimized=true
return}node.name==="defs"&&allDefs.set(node,parentNode)
if(node.name==="use")for(const attr of Object.keys(node.attributes)){if(attr!=="href"&&!attr.endsWith(":href"))continue
const value=node.attributes[attr]
const id=value.slice(1)
let refs=referencesById.get(id)
if(!refs){refs=[]
referencesById.set(id,refs)}refs.push({node:node,parentNode:parentNode})}const computedStyle=computeStyle(stylesheet,node)
if(isHidden&&computedStyle.visibility&&computedStyle.visibility.type==="static"&&computedStyle.visibility.value==="hidden"&&querySelector(node,"[visibility=visible]")==null){removeElement(node,parentNode)
return}if(displayNone&&computedStyle.display&&computedStyle.display.type==="static"&&computedStyle.display.value==="none"&&node.name!=="marker"){removeElement(node,parentNode)
return}if(circleR0&&node.name==="circle"&&node.children.length===0&&node.attributes.r==="0"){removeElement(node,parentNode)
return}if(ellipseRX0&&node.name==="ellipse"&&node.children.length===0&&node.attributes.rx==="0"){removeElement(node,parentNode)
return}if(ellipseRY0&&node.name==="ellipse"&&node.children.length===0&&node.attributes.ry==="0"){removeElement(node,parentNode)
return}if(rectWidth0&&node.name==="rect"&&node.children.length===0&&node.attributes.width==="0"){removeElement(node,parentNode)
return}if(rectHeight0&&rectWidth0&&node.name==="rect"&&node.children.length===0&&node.attributes.height==="0"){removeElement(node,parentNode)
return}if(patternWidth0&&node.name==="pattern"&&node.attributes.width==="0"){removeElement(node,parentNode)
return}if(patternHeight0&&node.name==="pattern"&&node.attributes.height==="0"){removeElement(node,parentNode)
return}if(imageWidth0&&node.name==="image"&&node.attributes.width==="0"){removeElement(node,parentNode)
return}if(imageHeight0&&node.name==="image"&&node.attributes.height==="0"){removeElement(node,parentNode)
return}if(pathEmptyD&&node.name==="path"){if(node.attributes.d==null){removeElement(node,parentNode)
return}const pathData=parsePathData(node.attributes.d)
if(pathData.length===0){removeElement(node,parentNode)
return}if(pathData.length===1&&computedStyle["marker-start"]==null&&computedStyle["marker-end"]==null){removeElement(node,parentNode)
return}}if(polylineEmptyPoints&&node.name==="polyline"&&node.attributes.points==null){removeElement(node,parentNode)
return}if(polygonEmptyPoints&&node.name==="polygon"&&node.attributes.points==null){removeElement(node,parentNode)
return}for(const[name,value]of Object.entries(node.attributes)){const ids=findReferences(name,value)
for(const id of ids)allReferences.add(id)}}},root:{exit:()=>{for(const id of removedDefIds){const refs=referencesById.get(id)
if(refs)for(const{node:node,parentNode:parentNode}of refs)detachNodeFromParent(node,parentNode)}if(!deoptimized)for(const[nonRenderedNode,nonRenderedParent]of nonRenderedNodes.entries())canRemoveNonRenderingNode(nonRenderedNode)&&detachNodeFromParent(nonRenderedNode,nonRenderedParent)
for(const[node,parentNode]of allDefs.entries())node.children.length===0&&detachNodeFromParent(node,parentNode)}}}}
var removeHiddenElems=Object.freeze({__proto__:null,description:description$x,fn:fn$x,name:name$x})
const name$w="removeEmptyText"
const description$w="removes empty <text> elements"
const fn$w=(root,params)=>{const{text:text=true,tspan:tspan=true,tref:tref=true}=params
return{element:{enter:(node,parentNode)=>{text&&node.name==="text"&&node.children.length===0&&detachNodeFromParent(node,parentNode)
tspan&&node.name==="tspan"&&node.children.length===0&&detachNodeFromParent(node,parentNode)
tref&&node.name==="tref"&&node.attributes["xlink:href"]==null&&detachNodeFromParent(node,parentNode)}}}}
var removeEmptyText=Object.freeze({__proto__:null,description:description$w,fn:fn$w,name:name$w})
const name$v="convertShapeToPath"
const description$v="converts basic shapes to more compact path form"
const regNumber=/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g
const fn$v=(root,params)=>{const{convertArcs:convertArcs=false,floatPrecision:precision}=params
return{element:{enter:(node,parentNode)=>{if(node.name==="rect"&&node.attributes.width!=null&&node.attributes.height!=null&&node.attributes.rx==null&&node.attributes.ry==null){const x=Number(node.attributes.x||"0")
const y=Number(node.attributes.y||"0")
const width=Number(node.attributes.width)
const height=Number(node.attributes.height)
if(Number.isNaN(x-y+width-height))return
const pathData=[{command:"M",args:[x,y]},{command:"H",args:[x+width]},{command:"V",args:[y+height]},{command:"H",args:[x]},{command:"z",args:[]}]
node.name="path"
node.attributes.d=stringifyPathData({pathData:pathData,precision:precision})
delete node.attributes.x
delete node.attributes.y
delete node.attributes.width
delete node.attributes.height}if(node.name==="line"){const x1=Number(node.attributes.x1||"0")
const y1=Number(node.attributes.y1||"0")
const x2=Number(node.attributes.x2||"0")
const y2=Number(node.attributes.y2||"0")
if(Number.isNaN(x1-y1+x2-y2))return
const pathData=[{command:"M",args:[x1,y1]},{command:"L",args:[x2,y2]}]
node.name="path"
node.attributes.d=stringifyPathData({pathData:pathData,precision:precision})
delete node.attributes.x1
delete node.attributes.y1
delete node.attributes.x2
delete node.attributes.y2}if((node.name==="polyline"||node.name==="polygon")&&node.attributes.points!=null){const coords=(node.attributes.points.match(regNumber)||[]).map(Number)
if(coords.length<4){detachNodeFromParent(node,parentNode)
return}const pathData=[]
for(let i=0;i<coords.length;i+=2)pathData.push({command:i===0?"M":"L",args:coords.slice(i,i+2)})
node.name==="polygon"&&pathData.push({command:"z",args:[]})
node.name="path"
node.attributes.d=stringifyPathData({pathData:pathData,precision:precision})
delete node.attributes.points}if(node.name==="circle"&&convertArcs){const cx=Number(node.attributes.cx||"0")
const cy=Number(node.attributes.cy||"0")
const r=Number(node.attributes.r||"0")
if(Number.isNaN(cx-cy+r))return
const pathData=[{command:"M",args:[cx,cy-r]},{command:"A",args:[r,r,0,1,0,cx,cy+r]},{command:"A",args:[r,r,0,1,0,cx,cy-r]},{command:"z",args:[]}]
node.name="path"
node.attributes.d=stringifyPathData({pathData:pathData,precision:precision})
delete node.attributes.cx
delete node.attributes.cy
delete node.attributes.r}if(node.name==="ellipse"&&convertArcs){const ecx=Number(node.attributes.cx||"0")
const ecy=Number(node.attributes.cy||"0")
const rx=Number(node.attributes.rx||"0")
const ry=Number(node.attributes.ry||"0")
if(Number.isNaN(ecx-ecy+rx-ry))return
const pathData=[{command:"M",args:[ecx,ecy-ry]},{command:"A",args:[rx,ry,0,1,0,ecx,ecy+ry]},{command:"A",args:[rx,ry,0,1,0,ecx,ecy-ry]},{command:"z",args:[]}]
node.name="path"
node.attributes.d=stringifyPathData({pathData:pathData,precision:precision})
delete node.attributes.cx
delete node.attributes.cy
delete node.attributes.rx
delete node.attributes.ry}}}}}
var convertShapeToPath=Object.freeze({__proto__:null,description:description$v,fn:fn$v,name:name$v})
const name$u="convertEllipseToCircle"
const description$u="converts non-eccentric <ellipse>s to <circle>s"
const fn$u=()=>({element:{enter:node=>{if(node.name==="ellipse"){const rx=node.attributes.rx||"0"
const ry=node.attributes.ry||"0"
if(rx===ry||rx==="auto"||ry==="auto"){node.name="circle"
const radius=rx==="auto"?ry:rx
delete node.attributes.rx
delete node.attributes.ry
node.attributes.r=radius}}}}})
var convertEllipseToCircle=Object.freeze({__proto__:null,description:description$u,fn:fn$u,name:name$u})
const name$t="moveElemsAttrsToGroup"
const description$t="Move common attributes of group children to the group"
const fn$t=root=>{let deoptimizedWithStyles=false
visit(root,{element:{enter:node=>{node.name==="style"&&(deoptimizedWithStyles=true)}}})
return{element:{exit:node=>{if(node.name!=="g"||node.children.length<=1)return
if(deoptimizedWithStyles)return
const commonAttributes=new Map
let initial=true
let everyChildIsPath=true
for(const child of node.children)if(child.type==="element"){pathElems.has(child.name)||(everyChildIsPath=false)
if(initial){initial=false
for(const[name,value]of Object.entries(child.attributes))inheritableAttrs.has(name)&&commonAttributes.set(name,value)}else for(const[name,value]of commonAttributes)child.attributes[name]!==value&&commonAttributes.delete(name)}node.attributes["filter"]==null&&node.attributes["clip-path"]==null&&node.attributes.mask==null||commonAttributes.delete("transform")
everyChildIsPath&&commonAttributes.delete("transform")
for(const[name,value]of commonAttributes)name==="transform"?node.attributes.transform!=null?node.attributes.transform=`${node.attributes.transform} ${value}`:node.attributes.transform=value:node.attributes[name]=value
for(const child of node.children)if(child.type==="element")for(const[name]of commonAttributes)delete child.attributes[name]}}}}
var moveElemsAttrsToGroup=Object.freeze({__proto__:null,description:description$t,fn:fn$t,name:name$t})
const name$s="moveGroupAttrsToElems"
const description$s="moves some group attributes to the content elements"
const pathElemsWithGroupsAndText=[...pathElems,"g","text"]
const fn$s=()=>({element:{enter:node=>{if(node.name==="g"&&node.children.length!==0&&node.attributes.transform!=null&&Object.entries(node.attributes).some((([name,value])=>referencesProps.has(name)&&includesUrlReference(value)))===false&&node.children.every((child=>child.type==="element"&&pathElemsWithGroupsAndText.includes(child.name)&&child.attributes.id==null))){for(const child of node.children){const value=node.attributes.transform
child.type==="element"&&(child.attributes.transform!=null?child.attributes.transform=`${value} ${child.attributes.transform}`:child.attributes.transform=value)}delete node.attributes.transform}}}})
var moveGroupAttrsToElems=Object.freeze({__proto__:null,description:description$s,fn:fn$s,name:name$s})
const name$r="collapseGroups"
const description$r="collapses useless groups"
const hasAnimatedAttr=(node,name)=>{if(node.type==="element"){if(elemsGroups.animation.has(node.name)&&node.attributes.attributeName===name)return true
for(const child of node.children)if(hasAnimatedAttr(child,name))return true}return false}
const fn$r=root=>{const stylesheet=collectStylesheet(root)
return{element:{exit:(node,parentNode)=>{if(parentNode.type==="root"||parentNode.name==="switch")return
if(node.name!=="g"||node.children.length===0)return
if(Object.keys(node.attributes).length!==0&&node.children.length===1){const firstChild=node.children[0]
const nodeHasFilter=!!(node.attributes.filter||computeStyle(stylesheet,node).filter)
if(firstChild.type==="element"&&firstChild.attributes.id==null&&!nodeHasFilter&&(node.attributes.class==null||firstChild.attributes.class==null)&&(node.attributes["clip-path"]==null&&node.attributes.mask==null||firstChild.name==="g"&&node.attributes.transform==null&&firstChild.attributes.transform==null)){const newChildElemAttrs={...firstChild.attributes}
for(const[name,value]of Object.entries(node.attributes)){if(hasAnimatedAttr(firstChild,name))return
if(newChildElemAttrs[name]==null)newChildElemAttrs[name]=value
else if(name==="transform")newChildElemAttrs[name]=value+" "+newChildElemAttrs[name]
else if(newChildElemAttrs[name]==="inherit")newChildElemAttrs[name]=value
else if(!inheritableAttrs.has(name)&&newChildElemAttrs[name]!==value)return}node.attributes={}
firstChild.attributes=newChildElemAttrs}}if(Object.keys(node.attributes).length===0){for(const child of node.children)if(child.type==="element"&&elemsGroups.animation.has(child.name))return
const index=parentNode.children.indexOf(node)
parentNode.children.splice(index,1,...node.children)
for(const child of node.children)Object.defineProperty(child,"parentNode",{writable:true,value:parentNode})}}}}}
var collapseGroups=Object.freeze({__proto__:null,description:description$r,fn:fn$r,name:name$r})
var prevCtrlPoint
const path2js=path=>{if(path.pathJS)return path.pathJS
const pathData=[]
const newPathData=parsePathData(path.attributes.d)
for(const{command:command,args:args}of newPathData)pathData.push({command:command,args:args})
pathData.length&&pathData[0].command=="m"&&(pathData[0].command="M")
path.pathJS=pathData
return pathData}
const convertRelativeToAbsolute=data=>{const newData=[]
let start=[0,0]
let cursor=[0,0]
for(let{command:command,args:args}of data){args=args.slice()
if(command==="m"){args[0]+=cursor[0]
args[1]+=cursor[1]
command="M"}if(command==="M"){cursor[0]=args[0]
cursor[1]=args[1]
start[0]=cursor[0]
start[1]=cursor[1]}if(command==="h"){args[0]+=cursor[0]
command="H"}command==="H"&&(cursor[0]=args[0])
if(command==="v"){args[0]+=cursor[1]
command="V"}command==="V"&&(cursor[1]=args[0])
if(command==="l"){args[0]+=cursor[0]
args[1]+=cursor[1]
command="L"}if(command==="L"){cursor[0]=args[0]
cursor[1]=args[1]}if(command==="c"){args[0]+=cursor[0]
args[1]+=cursor[1]
args[2]+=cursor[0]
args[3]+=cursor[1]
args[4]+=cursor[0]
args[5]+=cursor[1]
command="C"}if(command==="C"){cursor[0]=args[4]
cursor[1]=args[5]}if(command==="s"){args[0]+=cursor[0]
args[1]+=cursor[1]
args[2]+=cursor[0]
args[3]+=cursor[1]
command="S"}if(command==="S"){cursor[0]=args[2]
cursor[1]=args[3]}if(command==="q"){args[0]+=cursor[0]
args[1]+=cursor[1]
args[2]+=cursor[0]
args[3]+=cursor[1]
command="Q"}if(command==="Q"){cursor[0]=args[2]
cursor[1]=args[3]}if(command==="t"){args[0]+=cursor[0]
args[1]+=cursor[1]
command="T"}if(command==="T"){cursor[0]=args[0]
cursor[1]=args[1]}if(command==="a"){args[5]+=cursor[0]
args[6]+=cursor[1]
command="A"}if(command==="A"){cursor[0]=args[5]
cursor[1]=args[6]}if(command==="z"||command==="Z"){cursor[0]=start[0]
cursor[1]=start[1]
command="z"}newData.push({command:command,args:args})}return newData}
const js2path=function(path,data,params){path.pathJS=data
const pathData=[]
for(const item of data){if(pathData.length!==0&&(item.command==="M"||item.command==="m")){const last=pathData[pathData.length-1]
last.command!=="M"&&last.command!=="m"||pathData.pop()}pathData.push({command:item.command,args:item.args})}path.attributes.d=stringifyPathData({pathData:pathData,precision:params.floatPrecision,disableSpaceAfterFlags:params.noSpaceAfterFlags})}
function set(dest,source){dest[0]=source[source.length-2]
dest[1]=source[source.length-1]
return dest}const intersects=function(path1,path2){const points1=gatherPoints(convertRelativeToAbsolute(path1))
const points2=gatherPoints(convertRelativeToAbsolute(path2))
if(points1.maxX<=points2.minX||points2.maxX<=points1.minX||points1.maxY<=points2.minY||points2.maxY<=points1.minY||points1.list.every((set1=>points2.list.every((set2=>set1.list[set1.maxX][0]<=set2.list[set2.minX][0]||set2.list[set2.maxX][0]<=set1.list[set1.minX][0]||set1.list[set1.maxY][1]<=set2.list[set2.minY][1]||set2.list[set2.maxY][1]<=set1.list[set1.minY][1])))))return false
const hullNest1=points1.list.map(convexHull)
const hullNest2=points2.list.map(convexHull)
return hullNest1.some((function(hull1){if(hull1.list.length<3)return false
return hullNest2.some((function(hull2){if(hull2.list.length<3)return false
var simplex=[getSupport(hull1,hull2,[1,0])],direction=minus(simplex[0])
var iterations=1e4
while(true){if(iterations--==0){console.error("Error: infinite loop while processing mergePaths plugin.")
return true}simplex.push(getSupport(hull1,hull2,direction))
if(dot(direction,simplex[simplex.length-1])<=0)return false
if(processSimplex(simplex,direction))return true}}))}))
function getSupport(a,b,direction){return sub(supportPoint(a,direction),supportPoint(b,minus(direction)))}function supportPoint(polygon,direction){var index=direction[1]>=0?direction[0]<0?polygon.maxY:polygon.maxX:direction[0]<0?polygon.minX:polygon.minY,max=-1/0,value
while((value=dot(polygon.list[index],direction))>max){max=value
index=++index%polygon.list.length}return polygon.list[(index||polygon.list.length)-1]}}
function processSimplex(simplex,direction){if(simplex.length==2){let a=simplex[1],b=simplex[0],AO=minus(simplex[1]),AB=sub(b,a)
if(dot(AO,AB)>0)set(direction,orth(AB,a))
else{set(direction,AO)
simplex.shift()}}else{let a=simplex[2],b=simplex[1],c=simplex[0],AB=sub(b,a),AC=sub(c,a),AO=minus(a),ACB=orth(AB,AC),ABC=orth(AC,AB)
if(dot(ACB,AO)>0)if(dot(AB,AO)>0){set(direction,ACB)
simplex.shift()}else{set(direction,AO)
simplex.splice(0,2)}else{if(!(dot(ABC,AO)>0))return true
if(dot(AC,AO)>0){set(direction,ABC)
simplex.splice(1,1)}else{set(direction,AO)
simplex.splice(0,2)}}}return false}function minus(v){return[-v[0],-v[1]]}function sub(v1,v2){return[v1[0]-v2[0],v1[1]-v2[1]]}function dot(v1,v2){return v1[0]*v2[0]+v1[1]*v2[1]}function orth(v,from){var o=[-v[1],v[0]]
return dot(o,minus(from))<0?minus(o):o}function gatherPoints(pathData){const points={list:[],minX:0,minY:0,maxX:0,maxY:0}
const addPoint=(path,point)=>{if(!path.list.length||point[1]>path.list[path.maxY][1]){path.maxY=path.list.length
points.maxY=points.list.length?Math.max(point[1],points.maxY):point[1]}if(!path.list.length||point[0]>path.list[path.maxX][0]){path.maxX=path.list.length
points.maxX=points.list.length?Math.max(point[0],points.maxX):point[0]}if(!path.list.length||point[1]<path.list[path.minY][1]){path.minY=path.list.length
points.minY=points.list.length?Math.min(point[1],points.minY):point[1]}if(!path.list.length||point[0]<path.list[path.minX][0]){path.minX=path.list.length
points.minX=points.list.length?Math.min(point[0],points.minX):point[0]}path.list.push(point)}
for(let i=0;i<pathData.length;i+=1){const pathDataItem=pathData[i]
let subPath=points.list.length===0?{list:[],minX:0,minY:0,maxX:0,maxY:0}:points.list[points.list.length-1]
let prev=i===0?null:pathData[i-1]
let basePoint=subPath.list.length===0?null:subPath.list[subPath.list.length-1]
let data=pathDataItem.args
let ctrlPoint=basePoint
const toAbsolute=(n,i)=>n+(basePoint==null?0:basePoint[i%2])
switch(pathDataItem.command){case"M":subPath={list:[],minX:0,minY:0,maxX:0,maxY:0}
points.list.push(subPath)
break
case"H":basePoint!=null&&addPoint(subPath,[data[0],basePoint[1]])
break
case"V":basePoint!=null&&addPoint(subPath,[basePoint[0],data[0]])
break
case"Q":addPoint(subPath,data.slice(0,2))
prevCtrlPoint=[data[2]-data[0],data[3]-data[1]]
break
case"T":if(basePoint!=null&&prev!=null&&(prev.command=="Q"||prev.command=="T")){ctrlPoint=[basePoint[0]+prevCtrlPoint[0],basePoint[1]+prevCtrlPoint[1]]
addPoint(subPath,ctrlPoint)
prevCtrlPoint=[data[0]-ctrlPoint[0],data[1]-ctrlPoint[1]]}break
case"C":basePoint!=null&&addPoint(subPath,[0.5*(basePoint[0]+data[0]),0.5*(basePoint[1]+data[1])])
addPoint(subPath,[0.5*(data[0]+data[2]),0.5*(data[1]+data[3])])
addPoint(subPath,[0.5*(data[2]+data[4]),0.5*(data[3]+data[5])])
prevCtrlPoint=[data[4]-data[2],data[5]-data[3]]
break
case"S":if(basePoint!=null&&prev!=null&&(prev.command=="C"||prev.command=="S")){addPoint(subPath,[basePoint[0]+0.5*prevCtrlPoint[0],basePoint[1]+0.5*prevCtrlPoint[1]])
ctrlPoint=[basePoint[0]+prevCtrlPoint[0],basePoint[1]+prevCtrlPoint[1]]}ctrlPoint!=null&&addPoint(subPath,[0.5*(ctrlPoint[0]+data[0]),0.5*(ctrlPoint[1]+data[1])])
addPoint(subPath,[0.5*(data[0]+data[2]),0.5*(data[1]+data[3])])
prevCtrlPoint=[data[2]-data[0],data[3]-data[1]]
break
case"A":if(basePoint!=null){var curves=a2c.apply(0,basePoint.concat(data))
for(var cData;(cData=curves.splice(0,6).map(toAbsolute)).length;){basePoint!=null&&addPoint(subPath,[0.5*(basePoint[0]+cData[0]),0.5*(basePoint[1]+cData[1])])
addPoint(subPath,[0.5*(cData[0]+cData[2]),0.5*(cData[1]+cData[3])])
addPoint(subPath,[0.5*(cData[2]+cData[4]),0.5*(cData[3]+cData[5])])
curves.length&&addPoint(subPath,basePoint=cData.slice(-2))}}break}data.length>=2&&addPoint(subPath,data.slice(-2))}return points}function convexHull(points){points.list.sort((function(a,b){return a[0]==b[0]?a[1]-b[1]:a[0]-b[0]}))
var lower=[],minY=0,bottom=0
for(let i=0;i<points.list.length;i++){while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],points.list[i])<=0)lower.pop()
if(points.list[i][1]<points.list[minY][1]){minY=i
bottom=lower.length}lower.push(points.list[i])}var upper=[],maxY=points.list.length-1,top=0
for(let i=points.list.length;i--;){while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],points.list[i])<=0)upper.pop()
if(points.list[i][1]>points.list[maxY][1]){maxY=i
top=upper.length}upper.push(points.list[i])}upper.pop()
lower.pop()
const hullList=lower.concat(upper)
const hull={list:hullList,minX:0,maxX:lower.length,minY:bottom,maxY:(lower.length+top)%hullList.length}
return hull}function cross(o,a,b){return(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])}const a2c=(x1,y1,rx,ry,angle,large_arc_flag,sweep_flag,x2,y2,recursive)=>{const _120=Math.PI*120/180
const rad=Math.PI/180*(+angle||0)
let res=[]
const rotateX=(x,y,rad)=>x*Math.cos(rad)-y*Math.sin(rad)
const rotateY=(x,y,rad)=>x*Math.sin(rad)+y*Math.cos(rad)
if(recursive){f1=recursive[0]
f2=recursive[1]
cx=recursive[2]
cy=recursive[3]}else{x1=rotateX(x1,y1,-rad)
y1=rotateY(x1,y1,-rad)
x2=rotateX(x2,y2,-rad)
y2=rotateY(x2,y2,-rad)
var x=(x1-x2)/2,y=(y1-y2)/2
var h=x*x/(rx*rx)+y*y/(ry*ry)
if(h>1){h=Math.sqrt(h)
rx*=h
ry*=h}var rx2=rx*rx
var ry2=ry*ry
var k=(large_arc_flag==sweep_flag?-1:1)*Math.sqrt(Math.abs((rx2*ry2-rx2*y*y-ry2*x*x)/(rx2*y*y+ry2*x*x)))
var cx=k*rx*y/ry+(x1+x2)/2
var cy=k*-ry*x/rx+(y1+y2)/2
var f1=Math.asin(Number(((y1-cy)/ry).toFixed(9)))
var f2=Math.asin(Number(((y2-cy)/ry).toFixed(9)))
f1=x1<cx?Math.PI-f1:f1
f2=x2<cx?Math.PI-f2:f2
f1<0&&(f1=Math.PI*2+f1)
f2<0&&(f2=Math.PI*2+f2)
sweep_flag&&f1>f2&&(f1-=Math.PI*2)
!sweep_flag&&f2>f1&&(f2-=Math.PI*2)}var df=f2-f1
if(Math.abs(df)>_120){var f2old=f2,x2old=x2,y2old=y2
f2=f1+_120*(sweep_flag&&f2>f1?1:-1)
x2=cx+rx*Math.cos(f2)
y2=cy+ry*Math.sin(f2)
res=a2c(x2,y2,rx,ry,angle,0,sweep_flag,x2old,y2old,[f2,f2old,cx,cy])}df=f2-f1
var c1=Math.cos(f1),s1=Math.sin(f1),c2=Math.cos(f2),s2=Math.sin(f2),t=Math.tan(df/4),hx=4/3*rx*t,hy=4/3*ry*t,m=[-hx*s1,hy*c1,x2+hx*s2-x1,y2-hy*c2-y1,x2-x1,y2-y1]
if(recursive)return m.concat(res)
res=m.concat(res)
var newres=[]
for(var i=0,n=res.length;i<n;i++)newres[i]=i%2?rotateY(res[i-1],res[i],rad):rotateX(res[i],res[i+1],rad)
return newres}
const transformTypes=new Set(["matrix","rotate","scale","skewX","skewY","translate"])
const regTransformSplit=/\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(\s*(.+?)\s*\)[\s,]*/
const regNumericValues$2=/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g
const transform2js=transformString=>{const transforms=[]
let currentTransform=null
for(const item of transformString.split(regTransformSplit)){if(!item)continue
if(transformTypes.has(item)){currentTransform={name:item,data:[]}
transforms.push(currentTransform)}else{let num
while(num=regNumericValues$2.exec(item)){num=Number(num)
currentTransform!=null&&currentTransform.data.push(num)}}}return currentTransform==null||currentTransform.data.length==0?[]:transforms}
const transformsMultiply=transforms=>{const matrixData=transforms.map((transform=>{if(transform.name==="matrix")return transform.data
return transformToMatrix(transform)}))
const matrixTransform={name:"matrix",data:matrixData.length>0?matrixData.reduce(multiplyTransformMatrices):[]}
return matrixTransform}
const mth={rad:deg=>deg*Math.PI/180,deg:rad=>rad*180/Math.PI,cos:deg=>Math.cos(mth.rad(deg)),acos:(val,floatPrecision)=>toFixed(mth.deg(Math.acos(val)),floatPrecision),sin:deg=>Math.sin(mth.rad(deg)),asin:(val,floatPrecision)=>toFixed(mth.deg(Math.asin(val)),floatPrecision),tan:deg=>Math.tan(mth.rad(deg)),atan:(val,floatPrecision)=>toFixed(mth.deg(Math.atan(val)),floatPrecision)}
const getDecompositions=matrix=>{const decompositions=[]
const qrab=decomposeQRAB(matrix)
const qrcd=decomposeQRCD(matrix)
qrab&&decompositions.push(qrab)
qrcd&&decompositions.push(qrcd)
return decompositions}
const decomposeQRAB=matrix=>{const data=matrix.data
const[a,b,c,d,e,f]=data
const delta=a*d-b*c
if(delta===0)return
const r=Math.hypot(a,b)
if(r===0)return
const decomposition=[]
const cosOfRotationAngle=a/r;(e||f)&&decomposition.push({name:"translate",data:[e,f]})
if(cosOfRotationAngle!==1){const rotationAngleRads=Math.acos(cosOfRotationAngle)
decomposition.push({name:"rotate",data:[mth.deg(b<0?-rotationAngleRads:rotationAngleRads),0,0]})}const sx=r
const sy=delta/sx
sx===1&&sy===1||decomposition.push({name:"scale",data:[sx,sy]})
const ac_plus_bd=a*c+b*d
ac_plus_bd&&decomposition.push({name:"skewX",data:[mth.deg(Math.atan(ac_plus_bd/(a*a+b*b)))]})
return decomposition}
const decomposeQRCD=matrix=>{const data=matrix.data
const[a,b,c,d,e,f]=data
const delta=a*d-b*c
if(delta===0)return
const s=Math.hypot(c,d)
if(s===0)return
const decomposition=[];(e||f)&&decomposition.push({name:"translate",data:[e,f]})
const rotationAngleRads=Math.PI/2-(d<0?-1:1)*Math.acos(-c/s)
decomposition.push({name:"rotate",data:[mth.deg(rotationAngleRads),0,0]})
const sx=delta/s
const sy=s
sx===1&&sy===1||decomposition.push({name:"scale",data:[sx,sy]})
const ac_plus_bd=a*c+b*d
ac_plus_bd&&decomposition.push({name:"skewY",data:[mth.deg(Math.atan(ac_plus_bd/(c*c+d*d)))]})
return decomposition}
const mergeTranslateAndRotate=(tx,ty,a)=>{const rotationAngleRads=mth.rad(a)
const d=1-Math.cos(rotationAngleRads)
const e=Math.sin(rotationAngleRads)
const cy=(d*ty+e*tx)/(d*d+e*e)
const cx=(tx-e*cy)/d
return{name:"rotate",data:[a,cx,cy]}}
const isIdentityTransform=t=>{switch(t.name){case"rotate":case"skewX":case"skewY":return t.data[0]===0
case"scale":return t.data[0]===1&&t.data[1]===1
case"translate":return t.data[0]===0&&t.data[1]===0}return false}
const optimize$2=(roundedTransforms,rawTransforms)=>{const optimizedTransforms=[]
for(let index=0;index<roundedTransforms.length;index++){const roundedTransform=roundedTransforms[index]
if(isIdentityTransform(roundedTransform))continue
const data=roundedTransform.data
switch(roundedTransform.name){case"rotate":switch(data[0]){case 180:case-180:{const next=roundedTransforms[index+1]
if(next&&next.name==="scale"){optimizedTransforms.push(createScaleTransform(next.data.map((v=>-v))))
index++}else optimizedTransforms.push({name:"scale",data:[-1]})}continue}optimizedTransforms.push({name:"rotate",data:data.slice(0,data[1]||data[2]?3:1)})
break
case"scale":optimizedTransforms.push(createScaleTransform(data))
break
case"skewX":case"skewY":optimizedTransforms.push({name:roundedTransform.name,data:[data[0]]})
break
case"translate":{const next=roundedTransforms[index+1]
if(next&&next.name==="rotate"&&next.data[0]!==180&&next.data[0]!==-180&&next.data[0]!==0&&next.data[1]===0&&next.data[2]===0){const data=rawTransforms[index].data
optimizedTransforms.push(mergeTranslateAndRotate(data[0],data[1],rawTransforms[index+1].data[0]))
index++
continue}}optimizedTransforms.push({name:"translate",data:data.slice(0,data[1]?2:1)})
break}}return optimizedTransforms.length?optimizedTransforms:[{name:"scale",data:[1]}]}
const createScaleTransform=data=>{const scaleData=data.slice(0,data[0]===data[1]?1:2)
return{name:"scale",data:scaleData}}
const matrixToTransform=(origMatrix,params)=>{const decomposed=getDecompositions(origMatrix)
let shortest
let shortestLen=Number.MAX_VALUE
for(const decomposition of decomposed){const roundedTransforms=decomposition.map((transformItem=>{const transformCopy={name:transformItem.name,data:[...transformItem.data]}
return roundTransform(transformCopy,params)}))
const optimized=optimize$2(roundedTransforms,decomposition)
const len=js2transform(optimized,params).length
if(len<shortestLen){shortest=optimized
shortestLen=len}}return shortest??[origMatrix]}
const transformToMatrix=transform=>{if(transform.name==="matrix")return transform.data
switch(transform.name){case"translate":return[1,0,0,1,transform.data[0],transform.data[1]||0]
case"scale":return[transform.data[0],0,0,transform.data[1]??transform.data[0],0,0]
case"rotate":var cos=mth.cos(transform.data[0]),sin=mth.sin(transform.data[0]),cx=transform.data[1]||0,cy=transform.data[2]||0
return[cos,sin,-sin,cos,(1-cos)*cx+sin*cy,(1-cos)*cy-sin*cx]
case"skewX":return[1,0,mth.tan(transform.data[0]),1,0,0]
case"skewY":return[1,mth.tan(transform.data[0]),0,1,0,0]
default:throw Error(`Unknown transform ${transform.name}`)}}
const transformArc=(cursor,arc,transform)=>{const x=arc[5]-cursor[0]
const y=arc[6]-cursor[1]
let a=arc[0]
let b=arc[1]
const rot=arc[2]*Math.PI/180
const cos=Math.cos(rot)
const sin=Math.sin(rot)
if(a>0&&b>0){let h=Math.pow(x*cos+y*sin,2)/(4*a*a)+Math.pow(y*cos-x*sin,2)/(4*b*b)
if(h>1){h=Math.sqrt(h)
a*=h
b*=h}}const ellipse=[a*cos,a*sin,-b*sin,b*cos,0,0]
const m=multiplyTransformMatrices(transform,ellipse)
const lastCol=m[2]*m[2]+m[3]*m[3]
const squareSum=m[0]*m[0]+m[1]*m[1]+lastCol
const root=Math.hypot(m[0]-m[3],m[1]+m[2])*Math.hypot(m[0]+m[3],m[1]-m[2])
if(root){const majorAxisSqr=(squareSum+root)/2
const minorAxisSqr=(squareSum-root)/2
const major=Math.abs(majorAxisSqr-lastCol)>1e-6
const sub=(major?majorAxisSqr:minorAxisSqr)-lastCol
const rowsSum=m[0]*m[2]+m[1]*m[3]
const term1=m[0]*sub+m[2]*rowsSum
const term2=m[1]*sub+m[3]*rowsSum
arc[0]=Math.sqrt(majorAxisSqr)
arc[1]=Math.sqrt(minorAxisSqr)
arc[2]=((major?term2<0:term1>0)?-1:1)*Math.acos((major?term1:term2)/Math.hypot(term1,term2))*180/Math.PI}else{arc[0]=arc[1]=Math.sqrt(squareSum/2)
arc[2]=0}transform[0]<0!==transform[3]<0&&(arc[4]=1-arc[4])
return arc}
const multiplyTransformMatrices=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]]
const roundTransform=(transform,params)=>{switch(transform.name){case"translate":transform.data=floatRound(transform.data,params)
break
case"rotate":transform.data=[...degRound(transform.data.slice(0,1),params),...floatRound(transform.data.slice(1),params)]
break
case"skewX":case"skewY":transform.data=degRound(transform.data,params)
break
case"scale":transform.data=transformRound(transform.data,params)
break
case"matrix":transform.data=[...transformRound(transform.data.slice(0,4),params),...floatRound(transform.data.slice(4),params)]
break}return transform}
const degRound=(data,params)=>params.degPrecision!=null&&params.degPrecision>=1&&params.floatPrecision<20?smartRound(params.degPrecision,data):round$1(data)
const floatRound=(data,params)=>params.floatPrecision>=1&&params.floatPrecision<20?smartRound(params.floatPrecision,data):round$1(data)
const transformRound=(data,params)=>params.transformPrecision>=1&&params.floatPrecision<20?smartRound(params.transformPrecision,data):round$1(data)
const round$1=data=>data.map(Math.round)
const smartRound=(precision,data)=>{for(var i=data.length,tolerance=+Math.pow(0.1,precision).toFixed(precision);i--;)if(toFixed(data[i],precision)!==data[i]){var rounded=+data[i].toFixed(precision-1)
data[i]=+Math.abs(rounded-data[i]).toFixed(precision+1)>=tolerance?+data[i].toFixed(precision):rounded}return data}
const js2transform=(transformJS,params)=>{const transformString=transformJS.map((transform=>{roundTransform(transform,params)
return`${transform.name}(${cleanupOutData(transform.data,params)})`})).join("")
return transformString}
const regNumericValues$1=/[-+]?(\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g
const applyTransforms=(root,params)=>{const stylesheet=collectStylesheet(root)
return{element:{enter:node=>{if(node.attributes.d==null)return
if(node.attributes.id!=null)return
if(node.attributes.transform==null||node.attributes.transform===""||node.attributes.style!=null||Object.entries(node.attributes).some((([name,value])=>referencesProps.has(name)&&includesUrlReference(value))))return
const computedStyle=computeStyle(stylesheet,node)
const transformStyle=computedStyle.transform
if(transformStyle.type==="static"&&transformStyle.value!==node.attributes.transform)return
const matrix=transformsMultiply(transform2js(node.attributes.transform))
const stroke=computedStyle.stroke?.type==="static"?computedStyle.stroke.value:null
const strokeWidth=computedStyle["stroke-width"]?.type==="static"?computedStyle["stroke-width"].value:null
const transformPrecision=params.transformPrecision
if(computedStyle.stroke?.type==="dynamic"||computedStyle["stroke-width"]?.type==="dynamic")return
const scale=Number(Math.hypot(matrix.data[0],matrix.data[1]).toFixed(transformPrecision))
if(stroke&&stroke!="none"){if(!params.applyTransformsStroked)return
if((matrix.data[0]!==matrix.data[3]||matrix.data[1]!==-matrix.data[2])&&(matrix.data[0]!==-matrix.data[3]||matrix.data[1]!==matrix.data[2]))return
if(scale!==1&&node.attributes["vector-effect"]!=="non-scaling-stroke"){node.attributes["stroke-width"]=(strokeWidth||attrsGroupsDefaults.presentation["stroke-width"]).trim().replace(regNumericValues$1,(num=>removeLeadingZero(Number(num)*scale)))
node.attributes["stroke-dashoffset"]!=null&&(node.attributes["stroke-dashoffset"]=node.attributes["stroke-dashoffset"].trim().replace(regNumericValues$1,(num=>removeLeadingZero(Number(num)*scale))))
node.attributes["stroke-dasharray"]!=null&&(node.attributes["stroke-dasharray"]=node.attributes["stroke-dasharray"].trim().replace(regNumericValues$1,(num=>removeLeadingZero(Number(num)*scale))))}}const pathData=path2js(node)
applyMatrixToPathData(pathData,matrix.data)
delete node.attributes.transform}}}}
const transformAbsolutePoint=(matrix,x,y)=>{const newX=matrix[0]*x+matrix[2]*y+matrix[4]
const newY=matrix[1]*x+matrix[3]*y+matrix[5]
return[newX,newY]}
const transformRelativePoint=(matrix,x,y)=>{const newX=matrix[0]*x+matrix[2]*y
const newY=matrix[1]*x+matrix[3]*y
return[newX,newY]}
const applyMatrixToPathData=(pathData,matrix)=>{const start=[0,0]
const cursor=[0,0]
for(const pathItem of pathData){let{command:command,args:args}=pathItem
if(command==="M"){cursor[0]=args[0]
cursor[1]=args[1]
start[0]=cursor[0]
start[1]=cursor[1]
const[x,y]=transformAbsolutePoint(matrix,args[0],args[1])
args[0]=x
args[1]=y}if(command==="m"){cursor[0]+=args[0]
cursor[1]+=args[1]
start[0]=cursor[0]
start[1]=cursor[1]
const[x,y]=transformRelativePoint(matrix,args[0],args[1])
args[0]=x
args[1]=y}if(command==="H"){command="L"
args=[args[0],cursor[1]]}if(command==="h"){command="l"
args=[args[0],0]}if(command==="V"){command="L"
args=[cursor[0],args[0]]}if(command==="v"){command="l"
args=[0,args[0]]}if(command==="L"){cursor[0]=args[0]
cursor[1]=args[1]
const[x,y]=transformAbsolutePoint(matrix,args[0],args[1])
args[0]=x
args[1]=y}if(command==="l"){cursor[0]+=args[0]
cursor[1]+=args[1]
const[x,y]=transformRelativePoint(matrix,args[0],args[1])
args[0]=x
args[1]=y}if(command==="C"){cursor[0]=args[4]
cursor[1]=args[5]
const[x1,y1]=transformAbsolutePoint(matrix,args[0],args[1])
const[x2,y2]=transformAbsolutePoint(matrix,args[2],args[3])
const[x,y]=transformAbsolutePoint(matrix,args[4],args[5])
args[0]=x1
args[1]=y1
args[2]=x2
args[3]=y2
args[4]=x
args[5]=y}if(command==="c"){cursor[0]+=args[4]
cursor[1]+=args[5]
const[x1,y1]=transformRelativePoint(matrix,args[0],args[1])
const[x2,y2]=transformRelativePoint(matrix,args[2],args[3])
const[x,y]=transformRelativePoint(matrix,args[4],args[5])
args[0]=x1
args[1]=y1
args[2]=x2
args[3]=y2
args[4]=x
args[5]=y}if(command==="S"){cursor[0]=args[2]
cursor[1]=args[3]
const[x2,y2]=transformAbsolutePoint(matrix,args[0],args[1])
const[x,y]=transformAbsolutePoint(matrix,args[2],args[3])
args[0]=x2
args[1]=y2
args[2]=x
args[3]=y}if(command==="s"){cursor[0]+=args[2]
cursor[1]+=args[3]
const[x2,y2]=transformRelativePoint(matrix,args[0],args[1])
const[x,y]=transformRelativePoint(matrix,args[2],args[3])
args[0]=x2
args[1]=y2
args[2]=x
args[3]=y}if(command==="Q"){cursor[0]=args[2]
cursor[1]=args[3]
const[x1,y1]=transformAbsolutePoint(matrix,args[0],args[1])
const[x,y]=transformAbsolutePoint(matrix,args[2],args[3])
args[0]=x1
args[1]=y1
args[2]=x
args[3]=y}if(command==="q"){cursor[0]+=args[2]
cursor[1]+=args[3]
const[x1,y1]=transformRelativePoint(matrix,args[0],args[1])
const[x,y]=transformRelativePoint(matrix,args[2],args[3])
args[0]=x1
args[1]=y1
args[2]=x
args[3]=y}if(command==="T"){cursor[0]=args[0]
cursor[1]=args[1]
const[x,y]=transformAbsolutePoint(matrix,args[0],args[1])
args[0]=x
args[1]=y}if(command==="t"){cursor[0]+=args[0]
cursor[1]+=args[1]
const[x,y]=transformRelativePoint(matrix,args[0],args[1])
args[0]=x
args[1]=y}if(command==="A"){transformArc(cursor,args,matrix)
cursor[0]=args[5]
cursor[1]=args[6]
if(Math.abs(args[2])>80){const a=args[0]
const rotation=args[2]
args[0]=args[1]
args[1]=a
args[2]=rotation+(rotation>0?-90:90)}const[x,y]=transformAbsolutePoint(matrix,args[5],args[6])
args[5]=x
args[6]=y}if(command==="a"){transformArc([0,0],args,matrix)
cursor[0]+=args[5]
cursor[1]+=args[6]
if(Math.abs(args[2])>80){const a=args[0]
const rotation=args[2]
args[0]=args[1]
args[1]=a
args[2]=rotation+(rotation>0?-90:90)}const[x,y]=transformRelativePoint(matrix,args[5],args[6])
args[5]=x
args[6]=y}if(command==="z"||command==="Z"){cursor[0]=start[0]
cursor[1]=start[1]}pathItem.command=command
pathItem.args=args}}
const name$q="convertPathData"
const description$q="optimizes path data: writes in shorter form, applies transformations"
let roundData
let precision
let error
let arcThreshold
let arcTolerance
const fn$q=(root,params)=>{const{applyTransforms:_applyTransforms=true,applyTransformsStroked:applyTransformsStroked=true,makeArcs:makeArcs={threshold:2.5,tolerance:0.5},straightCurves:straightCurves=true,convertToQ:convertToQ=true,lineShorthands:lineShorthands=true,convertToZ:convertToZ=true,curveSmoothShorthands:curveSmoothShorthands=true,floatPrecision:floatPrecision=3,transformPrecision:transformPrecision=5,smartArcRounding:smartArcRounding=true,removeUseless:removeUseless=true,collapseRepeated:collapseRepeated=true,utilizeAbsolute:utilizeAbsolute=true,leadingZero:leadingZero=true,negativeExtraSpace:negativeExtraSpace=true,noSpaceAfterFlags:noSpaceAfterFlags=false,forceAbsolutePath:forceAbsolutePath=false}=params
const newParams={applyTransforms:_applyTransforms,applyTransformsStroked:applyTransformsStroked,makeArcs:makeArcs,straightCurves:straightCurves,convertToQ:convertToQ,lineShorthands:lineShorthands,convertToZ:convertToZ,curveSmoothShorthands:curveSmoothShorthands,floatPrecision:floatPrecision,transformPrecision:transformPrecision,smartArcRounding:smartArcRounding,removeUseless:removeUseless,collapseRepeated:collapseRepeated,utilizeAbsolute:utilizeAbsolute,leadingZero:leadingZero,negativeExtraSpace:negativeExtraSpace,noSpaceAfterFlags:noSpaceAfterFlags,forceAbsolutePath:forceAbsolutePath}
_applyTransforms&&visit(root,applyTransforms(root,{transformPrecision:transformPrecision,applyTransformsStroked:applyTransformsStroked}))
const stylesheet=collectStylesheet(root)
return{element:{enter:node=>{if(pathElems.has(node.name)&&node.attributes.d!=null){const computedStyle=computeStyle(stylesheet,node)
precision=floatPrecision
error=precision!==false?+Math.pow(0.1,precision).toFixed(precision):1e-2
roundData=precision&&precision>0&&precision<20?strongRound:round
if(makeArcs){arcThreshold=makeArcs.threshold
arcTolerance=makeArcs.tolerance}const hasMarkerMid=computedStyle["marker-mid"]!=null
const maybeHasStroke=computedStyle.stroke&&(computedStyle.stroke.type==="dynamic"||computedStyle.stroke.value!=="none")
const maybeHasLinecap=computedStyle["stroke-linecap"]&&(computedStyle["stroke-linecap"].type==="dynamic"||computedStyle["stroke-linecap"].value!=="butt")
const maybeHasStrokeAndLinecap=maybeHasStroke&&maybeHasLinecap
const isSafeToUseZ=!maybeHasStroke||computedStyle["stroke-linecap"]?.type==="static"&&computedStyle["stroke-linecap"].value==="round"&&computedStyle["stroke-linejoin"]?.type==="static"&&computedStyle["stroke-linejoin"].value==="round"
let data=path2js(node)
if(data.length){const includesVertices=data.some((item=>item.command!=="m"&&item.command!=="M"))
convertToRelative(data)
data=filters(data,newParams,{isSafeToUseZ:isSafeToUseZ,maybeHasStrokeAndLinecap:maybeHasStrokeAndLinecap,hasMarkerMid:hasMarkerMid})
utilizeAbsolute&&(data=convertToMixed(data,newParams))
const hasMarker=node.attributes["marker-start"]!=null||node.attributes["marker-end"]!=null
const isMarkersOnlyPath=hasMarker&&includesVertices&&data.every((item=>item.command==="m"||item.command==="M"))
isMarkersOnlyPath&&data.push({command:"z",args:[]})
js2path(node,data,newParams)}}}}}}
const convertToRelative=pathData=>{let start=[0,0]
let cursor=[0,0]
let prevCoords=[0,0]
for(let i=0;i<pathData.length;i+=1){const pathItem=pathData[i]
let{command:command,args:args}=pathItem
if(command==="m"){cursor[0]+=args[0]
cursor[1]+=args[1]
start[0]=cursor[0]
start[1]=cursor[1]}if(command==="M"){i!==0&&(command="m")
args[0]-=cursor[0]
args[1]-=cursor[1]
cursor[0]+=args[0]
cursor[1]+=args[1]
start[0]=cursor[0]
start[1]=cursor[1]}if(command==="l"){cursor[0]+=args[0]
cursor[1]+=args[1]}if(command==="L"){command="l"
args[0]-=cursor[0]
args[1]-=cursor[1]
cursor[0]+=args[0]
cursor[1]+=args[1]}command==="h"&&(cursor[0]+=args[0])
if(command==="H"){command="h"
args[0]-=cursor[0]
cursor[0]+=args[0]}command==="v"&&(cursor[1]+=args[0])
if(command==="V"){command="v"
args[0]-=cursor[1]
cursor[1]+=args[0]}if(command==="c"){cursor[0]+=args[4]
cursor[1]+=args[5]}if(command==="C"){command="c"
args[0]-=cursor[0]
args[1]-=cursor[1]
args[2]-=cursor[0]
args[3]-=cursor[1]
args[4]-=cursor[0]
args[5]-=cursor[1]
cursor[0]+=args[4]
cursor[1]+=args[5]}if(command==="s"){cursor[0]+=args[2]
cursor[1]+=args[3]}if(command==="S"){command="s"
args[0]-=cursor[0]
args[1]-=cursor[1]
args[2]-=cursor[0]
args[3]-=cursor[1]
cursor[0]+=args[2]
cursor[1]+=args[3]}if(command==="q"){cursor[0]+=args[2]
cursor[1]+=args[3]}if(command==="Q"){command="q"
args[0]-=cursor[0]
args[1]-=cursor[1]
args[2]-=cursor[0]
args[3]-=cursor[1]
cursor[0]+=args[2]
cursor[1]+=args[3]}if(command==="t"){cursor[0]+=args[0]
cursor[1]+=args[1]}if(command==="T"){command="t"
args[0]-=cursor[0]
args[1]-=cursor[1]
cursor[0]+=args[0]
cursor[1]+=args[1]}if(command==="a"){cursor[0]+=args[5]
cursor[1]+=args[6]}if(command==="A"){command="a"
args[5]-=cursor[0]
args[6]-=cursor[1]
cursor[0]+=args[5]
cursor[1]+=args[6]}if(command==="Z"||command==="z"){cursor[0]=start[0]
cursor[1]=start[1]}pathItem.command=command
pathItem.args=args
pathItem.base=prevCoords
pathItem.coords=[cursor[0],cursor[1]]
prevCoords=pathItem.coords}return pathData}
function filters(path,params,{isSafeToUseZ:isSafeToUseZ,maybeHasStrokeAndLinecap:maybeHasStrokeAndLinecap,hasMarkerMid:hasMarkerMid}){const stringify=data2Path.bind(null,params)
const relSubpoint=[0,0]
const pathBase=[0,0]
let prev={}
let prevQControlPoint
path=path.filter((function(item,index,path){const qControlPoint=prevQControlPoint
let command=item.command
let data=item.args
let next=path[index+1]
if(command!=="Z"&&command!=="z"){var sdata=data,circle
if(command==="s"){sdata=[0,0].concat(data)
const pdata=prev.args
const n=pdata.length
sdata[0]=pdata[n-2]-pdata[n-4]
sdata[1]=pdata[n-1]-pdata[n-3]}if(params.makeArcs&&(command=="c"||command=="s")&&isConvex(sdata)&&(circle=findCircle(sdata))){var r=roundData([circle.radius])[0],angle=findArcAngle(sdata,circle),sweep=sdata[5]*sdata[0]-sdata[4]*sdata[1]>0?1:0,arc={command:"a",args:[r,r,0,0,sweep,sdata[4],sdata[5]],coords:item.coords.slice(),base:item.base},output=[arc],relCenter=[circle.center[0]-sdata[4],circle.center[1]-sdata[5]],relCircle={center:relCenter,radius:circle.radius},arcCurves=[item],hasPrev=0,suffix="",nextLonghand
if(prev.command=="c"&&isConvex(prev.args)&&isArcPrev(prev.args,circle)||prev.command=="a"&&prev.sdata&&isArcPrev(prev.sdata,circle)){arcCurves.unshift(prev)
arc.base=prev.base
arc.args[5]=arc.coords[0]-arc.base[0]
arc.args[6]=arc.coords[1]-arc.base[1]
var prevData=prev.command=="a"?prev.sdata:prev.args
var prevAngle=findArcAngle(prevData,{center:[prevData[4]+circle.center[0],prevData[5]+circle.center[1]],radius:circle.radius})
angle+=prevAngle
angle>Math.PI&&(arc.args[3]=1)
hasPrev=1}for(var j=index;(next=path[++j])&&(next.command==="c"||next.command==="s");){var nextData=next.args
if(next.command=="s"){nextLonghand=makeLonghand({command:"s",args:next.args.slice()},path[j-1].args)
nextData=nextLonghand.args
nextLonghand.args=nextData.slice(0,2)
suffix=stringify([nextLonghand])}if(!isConvex(nextData)||!isArc(nextData,relCircle))break
angle+=findArcAngle(nextData,relCircle)
if(angle-2*Math.PI>1e-3)break
angle>Math.PI&&(arc.args[3]=1)
arcCurves.push(next)
if(!(2*Math.PI-angle>1e-3)){arc.args[5]=2*(relCircle.center[0]-nextData[4])
arc.args[6]=2*(relCircle.center[1]-nextData[5])
arc.coords=[arc.base[0]+arc.args[5],arc.base[1]+arc.args[6]]
arc={command:"a",args:[r,r,0,0,sweep,next.coords[0]-arc.coords[0],next.coords[1]-arc.coords[1]],coords:next.coords,base:arc.coords}
output.push(arc)
j++
break}arc.coords=next.coords
arc.args[5]=arc.coords[0]-arc.base[0]
arc.args[6]=arc.coords[1]-arc.base[1]
relCenter[0]-=nextData[4]
relCenter[1]-=nextData[5]}if((stringify(output)+suffix).length<stringify(arcCurves).length){path[j]&&path[j].command=="s"&&makeLonghand(path[j],path[j-1].args)
if(hasPrev){var prevArc=output.shift()
roundData(prevArc.args)
relSubpoint[0]+=prevArc.args[5]-prev.args[prev.args.length-2]
relSubpoint[1]+=prevArc.args[6]-prev.args[prev.args.length-1]
prev.command="a"
prev.args=prevArc.args
item.base=prev.coords=prevArc.coords}arc=output.shift()
arcCurves.length==1?item.sdata=sdata.slice():arcCurves.length-1-hasPrev>0&&path.splice(index+1,arcCurves.length-1-hasPrev,...output)
if(!arc)return false
command="a"
data=arc.args
item.coords=arc.coords}}if(precision!==false){if(command==="m"||command==="l"||command==="t"||command==="q"||command==="s"||command==="c")for(var i=data.length;i--;)data[i]+=item.base[i%2]-relSubpoint[i%2]
else if(command=="h")data[0]+=item.base[0]-relSubpoint[0]
else if(command=="v")data[0]+=item.base[1]-relSubpoint[1]
else if(command=="a"){data[5]+=item.base[0]-relSubpoint[0]
data[6]+=item.base[1]-relSubpoint[1]}roundData(data)
if(command=="h")relSubpoint[0]+=data[0]
else if(command=="v")relSubpoint[1]+=data[0]
else{relSubpoint[0]+=data[data.length-2]
relSubpoint[1]+=data[data.length-1]}roundData(relSubpoint)
if(command==="M"||command==="m"){pathBase[0]=relSubpoint[0]
pathBase[1]=relSubpoint[1]}}const sagitta=command==="a"?calculateSagitta(data):void 0
if(params.smartArcRounding&&sagitta!==void 0&&precision)for(let precisionNew=precision;precisionNew>=0;precisionNew--){const radius=toFixed(data[0],precisionNew)
const sagittaNew=calculateSagitta([radius,radius,...data.slice(2)])
if(!(Math.abs(sagitta-sagittaNew)<error))break
data[0]=radius
data[1]=radius}if(params.straightCurves)if(command==="c"&&isCurveStraightLine(data)||command==="s"&&isCurveStraightLine(sdata)){next&&next.command=="s"&&makeLonghand(next,data)
command="l"
data=data.slice(-2)}else if(command==="q"&&isCurveStraightLine(data)){next&&next.command=="t"&&makeLonghand(next,data)
command="l"
data=data.slice(-2)}else if(command==="t"&&prev.command!=="q"&&prev.command!=="t"){command="l"
data=data.slice(-2)}else if(command==="a"&&(data[0]===0||data[1]===0||sagitta!==void 0&&sagitta<error)){command="l"
data=data.slice(-2)}if(params.convertToQ&&command=="c"){const x1=0.75*(item.base[0]+data[0])-0.25*item.base[0]
const x2=0.75*(item.base[0]+data[2])-0.25*(item.base[0]+data[4])
if(Math.abs(x1-x2)<error*2){const y1=0.75*(item.base[1]+data[1])-0.25*item.base[1]
const y2=0.75*(item.base[1]+data[3])-0.25*(item.base[1]+data[5])
if(Math.abs(y1-y2)<error*2){const newData=data.slice()
newData.splice(0,4,x1+x2-item.base[0],y1+y2-item.base[1])
roundData(newData)
const originalLength=cleanupOutData(data,params).length,newLength=cleanupOutData(newData,params).length
if(newLength<originalLength){command="q"
data=newData
next&&next.command=="s"&&makeLonghand(next,data)}}}}if(params.lineShorthands&&command==="l")if(data[1]===0){command="h"
data.pop()}else if(data[0]===0){command="v"
data.shift()}if(params.collapseRepeated&&hasMarkerMid===false&&(command==="m"||command==="h"||command==="v")&&prev.command&&command==prev.command.toLowerCase()&&(command!="h"&&command!="v"||prev.args[0]>=0==data[0]>=0)){prev.args[0]+=data[0]
command!="h"&&command!="v"&&(prev.args[1]+=data[1])
prev.coords=item.coords
path[index]=prev
return false}if(params.curveSmoothShorthands&&prev.command)if(command==="c"){if(prev.command==="c"&&Math.abs(data[0]- -(prev.args[2]-prev.args[4]))<error&&Math.abs(data[1]- -(prev.args[3]-prev.args[5]))<error){command="s"
data=data.slice(2)}else if(prev.command==="s"&&Math.abs(data[0]- -(prev.args[0]-prev.args[2]))<error&&Math.abs(data[1]- -(prev.args[1]-prev.args[3]))<error){command="s"
data=data.slice(2)}else if(prev.command!=="c"&&prev.command!=="s"&&Math.abs(data[0])<error&&Math.abs(data[1])<error){command="s"
data=data.slice(2)}}else if(command==="q")if(prev.command==="q"&&Math.abs(data[0]-(prev.args[2]-prev.args[0]))<error&&Math.abs(data[1]-(prev.args[3]-prev.args[1]))<error){command="t"
data=data.slice(2)}else if(prev.command==="t"){const predictedControlPoint=reflectPoint(qControlPoint,item.base)
const realControlPoint=[data[0]+item.base[0],data[1]+item.base[1]]
if(Math.abs(predictedControlPoint[0]-realControlPoint[0])<error&&Math.abs(predictedControlPoint[1]-realControlPoint[1])<error){command="t"
data=data.slice(2)}}if(params.removeUseless&&!maybeHasStrokeAndLinecap){if((command==="l"||command==="h"||command==="v"||command==="q"||command==="t"||command==="c"||command==="s")&&data.every((function(i){return i===0}))){path[index]=prev
return false}if(command==="a"&&data[5]===0&&data[6]===0){path[index]=prev
return false}}if(params.convertToZ&&(isSafeToUseZ||next?.command==="Z"||next?.command==="z")&&(command==="l"||command==="h"||command==="v")&&Math.abs(pathBase[0]-item.coords[0])<error&&Math.abs(pathBase[1]-item.coords[1])<error){command="z"
data=[]}item.command=command
item.args=data}else{relSubpoint[0]=pathBase[0]
relSubpoint[1]=pathBase[1]
if(prev.command==="Z"||prev.command==="z")return false}if((command==="Z"||command==="z")&&params.removeUseless&&isSafeToUseZ&&Math.abs(item.base[0]-item.coords[0])<error/10&&Math.abs(item.base[1]-item.coords[1])<error/10)return false
prevQControlPoint=command==="q"?[data[0]+item.base[0],data[1]+item.base[1]]:command==="t"?qControlPoint?reflectPoint(qControlPoint,item.base):item.coords:void 0
prev=item
return true}))
return path}function convertToMixed(path,params){var prev=path[0]
path=path.filter((function(item,index){if(index==0)return true
if(item.command==="Z"||item.command==="z"){prev=item
return true}var command=item.command,data=item.args,adata=data.slice(),rdata=data.slice()
if(command==="m"||command==="l"||command==="t"||command==="q"||command==="s"||command==="c")for(var i=adata.length;i--;)adata[i]+=item.base[i%2]
else if(command=="h")adata[0]+=item.base[0]
else if(command=="v")adata[0]+=item.base[1]
else if(command=="a"){adata[5]+=item.base[0]
adata[6]+=item.base[1]}roundData(adata)
roundData(rdata)
var absoluteDataStr=cleanupOutData(adata,params),relativeDataStr=cleanupOutData(rdata,params)
if(params.forceAbsolutePath||absoluteDataStr.length<relativeDataStr.length&&!(params.negativeExtraSpace&&command==prev.command&&prev.command.charCodeAt(0)>96&&absoluteDataStr.length==relativeDataStr.length-1&&(data[0]<0||Math.floor(data[0])===0&&!Number.isInteger(data[0])&&prev.args[prev.args.length-1]%1))){item.command=command.toUpperCase()
item.args=adata}prev=item
return true}))
return path}function isConvex(data){var center=getIntersection([0,0,data[2],data[3],data[0],data[1],data[4],data[5]])
return center!=null&&data[2]<center[0]==center[0]<0&&data[3]<center[1]==center[1]<0&&data[4]<center[0]==center[0]<data[0]&&data[5]<center[1]==center[1]<data[1]}function getIntersection(coords){var a1=coords[1]-coords[3],b1=coords[2]-coords[0],c1=coords[0]*coords[3]-coords[2]*coords[1],a2=coords[5]-coords[7],b2=coords[6]-coords[4],c2=coords[4]*coords[7]-coords[5]*coords[6],denom=a1*b2-a2*b1
if(!denom)return
var cross=[(b1*c2-b2*c1)/denom,(a1*c2-a2*c1)/-denom]
if(!isNaN(cross[0])&&!isNaN(cross[1])&&isFinite(cross[0])&&isFinite(cross[1]))return cross}function strongRound(data){const precisionNum=precision||0
for(let i=data.length;i-- >0;){const fixed=toFixed(data[i],precisionNum)
if(fixed!==data[i]){const rounded=toFixed(data[i],precisionNum-1)
data[i]=toFixed(Math.abs(rounded-data[i]),precisionNum+1)>=error?fixed:rounded}}return data}function round(data){for(var i=data.length;i-- >0;)data[i]=Math.round(data[i])
return data}function isCurveStraightLine(data){var i=data.length-2,a=-data[i+1],b=data[i],d=1/(a*a+b*b)
if(i<=1||!isFinite(d))return false
while((i-=2)>=0)if(Math.sqrt(Math.pow(a*data[i]+b*data[i+1],2)*d)>error)return false
return true}function calculateSagitta(data){if(data[3]===1)return
const[rx,ry]=data
if(Math.abs(rx-ry)>error)return
const chord=Math.hypot(data[5],data[6])
if(chord>rx*2)return
return rx-Math.sqrt(rx**2-0.25*chord**2)}function makeLonghand(item,data){switch(item.command){case"s":item.command="c"
break
case"t":item.command="q"
break}item.args.unshift(data[data.length-2]-data[data.length-4],data[data.length-1]-data[data.length-3])
return item}function getDistance(point1,point2){return Math.hypot(point1[0]-point2[0],point1[1]-point2[1])}function reflectPoint(controlPoint,base){return[2*base[0]-controlPoint[0],2*base[1]-controlPoint[1]]}function getCubicBezierPoint(curve,t){var sqrT=t*t,cubT=sqrT*t,mt=1-t,sqrMt=mt*mt
return[3*sqrMt*t*curve[0]+3*mt*sqrT*curve[2]+cubT*curve[4],3*sqrMt*t*curve[1]+3*mt*sqrT*curve[3]+cubT*curve[5]]}function findCircle(curve){var midPoint=getCubicBezierPoint(curve,.5),m1=[midPoint[0]/2,midPoint[1]/2],m2=[(midPoint[0]+curve[4])/2,(midPoint[1]+curve[5])/2],center=getIntersection([m1[0],m1[1],m1[0]+m1[1],m1[1]-m1[0],m2[0],m2[1],m2[0]+(m2[1]-midPoint[1]),m2[1]-(m2[0]-midPoint[0])]),radius=center&&getDistance([0,0],center),tolerance=Math.min(arcThreshold*error,arcTolerance*radius/100)
if(center&&radius<1e15&&[1/4,3/4].every((function(point){return Math.abs(getDistance(getCubicBezierPoint(curve,point),center)-radius)<=tolerance})))return{center:center,radius:radius}}function isArc(curve,circle){var tolerance=Math.min(arcThreshold*error,arcTolerance*circle.radius/100)
return[0,1/4,.5,3/4,1].every((function(point){return Math.abs(getDistance(getCubicBezierPoint(curve,point),circle.center)-circle.radius)<=tolerance}))}function isArcPrev(curve,circle){return isArc(curve,{center:[circle.center[0]+curve[4],circle.center[1]+curve[5]],radius:circle.radius})}function findArcAngle(curve,relCircle){var x1=-relCircle.center[0],y1=-relCircle.center[1],x2=curve[4]-relCircle.center[0],y2=curve[5]-relCircle.center[1]
return Math.acos((x1*x2+y1*y2)/Math.sqrt((x1*x1+y1*y1)*(x2*x2+y2*y2)))}function data2Path(params,pathData){return pathData.reduce((function(pathString,item){var strData=""
item.args&&(strData=cleanupOutData(roundData(item.args.slice()),params))
return pathString+item.command+strData}),"")}var convertPathData=Object.freeze({__proto__:null,description:description$q,fn:fn$q,name:name$q})
const name$p="convertTransform"
const description$p="collapses multiple transformations and optimizes it"
const fn$p=(_root,params)=>{const{convertToShorts:convertToShorts=true,degPrecision:degPrecision,floatPrecision:floatPrecision=3,transformPrecision:transformPrecision=5,matrixToTransform:matrixToTransform=true,shortTranslate:shortTranslate=true,shortScale:shortScale=true,shortRotate:shortRotate=true,removeUseless:removeUseless=true,collapseIntoOne:collapseIntoOne=true,leadingZero:leadingZero=true,negativeExtraSpace:negativeExtraSpace=false}=params
const newParams={convertToShorts:convertToShorts,degPrecision:degPrecision,floatPrecision:floatPrecision,transformPrecision:transformPrecision,matrixToTransform:matrixToTransform,shortTranslate:shortTranslate,shortScale:shortScale,shortRotate:shortRotate,removeUseless:removeUseless,collapseIntoOne:collapseIntoOne,leadingZero:leadingZero,negativeExtraSpace:negativeExtraSpace}
return{element:{enter:node=>{node.attributes.transform!=null&&convertTransform(node,"transform",newParams)
node.attributes.gradientTransform!=null&&convertTransform(node,"gradientTransform",newParams)
node.attributes.patternTransform!=null&&convertTransform(node,"patternTransform",newParams)}}}}
const convertTransform=(item,attrName,params)=>{let data=transform2js(item.attributes[attrName])
params=definePrecision(data,params)
params.collapseIntoOne&&data.length>1&&(data=[transformsMultiply(data)])
params.convertToShorts?data=convertToShorts(data,params):data.forEach((item=>roundTransform(item,params)))
params.removeUseless&&(data=removeUseless(data))
data.length?item.attributes[attrName]=js2transform(data,params):delete item.attributes[attrName]}
const definePrecision=(data,{...newParams})=>{const matrixData=[]
for(const item of data)item.name=="matrix"&&matrixData.push(...item.data.slice(0,4))
let numberOfDigits=newParams.transformPrecision
if(matrixData.length){newParams.transformPrecision=Math.min(newParams.transformPrecision,Math.max.apply(Math,matrixData.map(floatDigits))||newParams.transformPrecision)
numberOfDigits=Math.max.apply(Math,matrixData.map((n=>n.toString().replace(/\D+/g,"").length)))}newParams.degPrecision==null&&(newParams.degPrecision=Math.max(0,Math.min(newParams.floatPrecision,numberOfDigits-2)))
return newParams}
const floatDigits=n=>{const str=n.toString()
return str.slice(str.indexOf(".")).length-1}
const convertToShorts=(transforms,params)=>{for(var i=0;i<transforms.length;i++){let transform=transforms[i]
if(params.matrixToTransform&&transform.name==="matrix"){var decomposed=matrixToTransform(transform,params)
js2transform(decomposed,params).length<=js2transform([transform],params).length&&transforms.splice(i,1,...decomposed)
transform=transforms[i]}roundTransform(transform,params)
params.shortTranslate&&transform.name==="translate"&&transform.data.length===2&&!transform.data[1]&&transform.data.pop()
params.shortScale&&transform.name==="scale"&&transform.data.length===2&&transform.data[0]===transform.data[1]&&transform.data.pop()
if(params.shortRotate&&transforms[i-2]?.name==="translate"&&transforms[i-1].name==="rotate"&&transforms[i].name==="translate"&&transforms[i-2].data[0]===-transforms[i].data[0]&&transforms[i-2].data[1]===-transforms[i].data[1]){transforms.splice(i-2,3,{name:"rotate",data:[transforms[i-1].data[0],transforms[i-2].data[0],transforms[i-2].data[1]]})
i-=2}}return transforms}
const removeUseless=transforms=>transforms.filter((transform=>{if(["translate","rotate","skewX","skewY"].indexOf(transform.name)>-1&&(transform.data.length==1||transform.name=="rotate")&&!transform.data[0]||transform.name=="translate"&&!transform.data[0]&&!transform.data[1]||transform.name=="scale"&&transform.data[0]==1&&(transform.data.length<2||transform.data[1]==1)||transform.name=="matrix"&&transform.data[0]==1&&transform.data[3]==1&&!(transform.data[1]||transform.data[2]||transform.data[4]||transform.data[5]))return false
return true}))
var convertTransform$1=Object.freeze({__proto__:null,description:description$p,fn:fn$p,name:name$p})
const name$o="removeEmptyAttrs"
const description$o="removes empty attributes"
const fn$o=()=>({element:{enter:node=>{for(const[name,value]of Object.entries(node.attributes))value!==""||attrsGroups.conditionalProcessing.has(name)||delete node.attributes[name]}}})
var removeEmptyAttrs=Object.freeze({__proto__:null,description:description$o,fn:fn$o,name:name$o})
const name$n="removeEmptyContainers"
const description$n="removes empty container elements"
const fn$n=()=>({element:{exit:(node,parentNode)=>{if(node.name==="svg"||!elemsGroups.container.has(node.name)||node.children.length!==0)return
if(node.name==="pattern"&&Object.keys(node.attributes).length!==0)return
if(node.name==="g"&&node.attributes.filter!=null)return
if(node.name==="mask"&&node.attributes.id!=null)return
if(parentNode.type==="element"&&parentNode.name==="switch")return
detachNodeFromParent(node,parentNode)}}})
var removeEmptyContainers=Object.freeze({__proto__:null,description:description$n,fn:fn$n,name:name$n})
const name$m="mergePaths"
const description$m="merges multiple paths in one if possible"
function elementHasUrl(computedStyle,attName){const style=computedStyle[attName]
if(style?.type==="static")return includesUrlReference(style.value)
return false}const fn$m=(root,params)=>{const{force:force=false,floatPrecision:floatPrecision=3,noSpaceAfterFlags:noSpaceAfterFlags=false}=params
const stylesheet=collectStylesheet(root)
return{element:{enter:node=>{if(node.children.length<=1)return
const elementsToRemove=[]
let prevChild=node.children[0]
let prevPathData=null
const updatePreviousPath=(child,pathData)=>{js2path(child,pathData,{floatPrecision:floatPrecision,noSpaceAfterFlags:noSpaceAfterFlags})
prevPathData=null}
for(let i=1;i<node.children.length;i++){const child=node.children[i]
if(prevChild.type!=="element"||prevChild.name!=="path"||prevChild.children.length!==0||prevChild.attributes.d==null){prevPathData&&prevChild.type==="element"&&updatePreviousPath(prevChild,prevPathData)
prevChild=child
continue}if(child.type!=="element"||child.name!=="path"||child.children.length!==0||child.attributes.d==null){prevPathData&&updatePreviousPath(prevChild,prevPathData)
prevChild=child
continue}const computedStyle=computeStyle(stylesheet,child)
if(computedStyle["marker-start"]||computedStyle["marker-mid"]||computedStyle["marker-end"]||computedStyle["clip-path"]||computedStyle["mask"]||computedStyle["mask-image"]||["fill","filter","stroke"].some((attName=>elementHasUrl(computedStyle,attName)))){prevPathData&&updatePreviousPath(prevChild,prevPathData)
prevChild=child
continue}const childAttrs=Object.keys(child.attributes)
if(childAttrs.length!==Object.keys(prevChild.attributes).length){prevPathData&&updatePreviousPath(prevChild,prevPathData)
prevChild=child
continue}const areAttrsEqual=childAttrs.some((attr=>attr!=="d"&&prevChild.type==="element"&&prevChild.attributes[attr]!==child.attributes[attr]))
if(areAttrsEqual){prevPathData&&updatePreviousPath(prevChild,prevPathData)
prevChild=child
continue}const hasPrevPath=prevPathData!=null
const currentPathData=path2js(child)
prevPathData=prevPathData??path2js(prevChild)
if(force||!intersects(prevPathData,currentPathData)){prevPathData.push(...currentPathData)
elementsToRemove.push(child)
continue}hasPrevPath&&updatePreviousPath(prevChild,prevPathData)
prevChild=child
prevPathData=null}prevPathData&&prevChild.type==="element"&&updatePreviousPath(prevChild,prevPathData)
node.children=node.children.filter((child=>!elementsToRemove.includes(child)))}}}}
var mergePaths=Object.freeze({__proto__:null,description:description$m,fn:fn$m,name:name$m})
const name$l="removeUnusedNS"
const description$l="removes unused namespaces declaration"
const fn$l=()=>{const unusedNamespaces=new Set
return{element:{enter:(node,parentNode)=>{if(node.name==="svg"&&parentNode.type==="root")for(const name of Object.keys(node.attributes))if(name.startsWith("xmlns:")){const local=name.slice(6)
unusedNamespaces.add(local)}if(unusedNamespaces.size!==0){if(node.name.includes(":")){const[ns]=node.name.split(":")
unusedNamespaces.has(ns)&&unusedNamespaces.delete(ns)}for(const name of Object.keys(node.attributes))if(name.includes(":")){const[ns]=name.split(":")
unusedNamespaces.delete(ns)}}},exit:(node,parentNode)=>{if(node.name==="svg"&&parentNode.type==="root")for(const name of unusedNamespaces)delete node.attributes[`xmlns:${name}`]}}}}
var removeUnusedNS=Object.freeze({__proto__:null,description:description$l,fn:fn$l,name:name$l})
const name$k="sortAttrs"
const description$k="Sort element attributes for better compression"
const fn$k=(_root,params)=>{const{order:order=["id","width","height","x","x1","x2","y","y1","y2","cx","cy","r","fill","stroke","marker","d","points"],xmlnsOrder:xmlnsOrder="front"}=params
const getNsPriority=name=>{if(xmlnsOrder==="front"){if(name==="xmlns")return 3
if(name.startsWith("xmlns:"))return 2}if(name.includes(":"))return 1
return 0}
const compareAttrs=([aName],[bName])=>{const aPriority=getNsPriority(aName)
const bPriority=getNsPriority(bName)
const priorityNs=bPriority-aPriority
if(priorityNs!==0)return priorityNs
const[aPart]=aName.split("-")
const[bPart]=bName.split("-")
if(aPart!==bPart){const aInOrderFlag=order.includes(aPart)?1:0
const bInOrderFlag=order.includes(bPart)?1:0
if(aInOrderFlag===1&&bInOrderFlag===1)return order.indexOf(aPart)-order.indexOf(bPart)
const priorityOrder=bInOrderFlag-aInOrderFlag
if(priorityOrder!==0)return priorityOrder}return aName<bName?-1:1}
return{element:{enter:node=>{const attrs=Object.entries(node.attributes)
attrs.sort(compareAttrs)
const sortedAttributes={}
for(const[name,value]of attrs)sortedAttributes[name]=value
node.attributes=sortedAttributes}}}}
var sortAttrs=Object.freeze({__proto__:null,description:description$k,fn:fn$k,name:name$k})
const name$j="sortDefsChildren"
const description$j="Sorts children of <defs> to improve compression"
const fn$j=()=>({element:{enter:node=>{if(node.name==="defs"){const frequencies=new Map
for(const child of node.children)if(child.type==="element"){const frequency=frequencies.get(child.name)
frequency==null?frequencies.set(child.name,1):frequencies.set(child.name,frequency+1)}node.children.sort(((a,b)=>{if(a.type!=="element"||b.type!=="element")return 0
const aFrequency=frequencies.get(a.name)
const bFrequency=frequencies.get(b.name)
if(aFrequency!=null&&bFrequency!=null){const frequencyComparison=bFrequency-aFrequency
if(frequencyComparison!==0)return frequencyComparison}const lengthComparison=b.name.length-a.name.length
if(lengthComparison!==0)return lengthComparison
if(a.name!==b.name)return a.name>b.name?-1:1
return 0}))}}}})
var sortDefsChildren=Object.freeze({__proto__:null,description:description$j,fn:fn$j,name:name$j})
const name$i="removeTitle"
const description$i="removes <title>"
const fn$i=()=>({element:{enter:(node,parentNode)=>{node.name==="title"&&detachNodeFromParent(node,parentNode)}}})
var removeTitle=Object.freeze({__proto__:null,description:description$i,fn:fn$i,name:name$i})
const name$h="removeDesc"
const description$h="removes <desc>"
const standardDescs=/^(Created with|Created using)/
const fn$h=(root,params)=>{const{removeAny:removeAny=false}=params
return{element:{enter:(node,parentNode)=>{node.name==="desc"&&(removeAny||node.children.length===0||node.children[0].type==="text"&&standardDescs.test(node.children[0].value))&&detachNodeFromParent(node,parentNode)}}}}
var removeDesc=Object.freeze({__proto__:null,description:description$h,fn:fn$h,name:name$h})
const presetDefault=createPreset({name:"preset-default",plugins:[removeDoctype,removeXMLProcInst,removeComments,removeDeprecatedAttrs,removeMetadata,removeEditorsNSData,cleanupAttrs,mergeStyles,inlineStyles,minifyStyles,cleanupIds,removeUselessDefs,cleanupNumericValues,convertColors,removeUnknownsAndDefaults,removeNonInheritableGroupAttrs,removeUselessStrokeAndFill,removeViewBox,cleanupEnableBackground,removeHiddenElems,removeEmptyText,convertShapeToPath,convertEllipseToCircle,moveElemsAttrsToGroup,moveGroupAttrsToElems,collapseGroups,convertPathData,convertTransform$1,removeEmptyAttrs,removeEmptyContainers,mergePaths,removeUnusedNS,sortAttrs,sortDefsChildren,removeTitle,removeDesc]})
const name$g="addAttributesToSVGElement"
const description$g="adds attributes to an outer <svg> element"
var ENOCLS$1='Error in plugin "addAttributesToSVGElement": absent parameters.\nIt should have a list of "attributes" or one "attribute".\nConfig example:\n\nplugins: [\n  {\n    name: \'addAttributesToSVGElement\',\n    params: {\n      attribute: "mySvg"\n    }\n  }\n]\n\nplugins: [\n  {\n    name: \'addAttributesToSVGElement\',\n    params: {\n      attributes: ["mySvg", "size-big"]\n    }\n  }\n]\n\nplugins: [\n  {\n    name: \'addAttributesToSVGElement\',\n    params: {\n      attributes: [\n        {\n          focusable: false\n        },\n        {\n          \'data-image\': icon\n        }\n      ]\n    }\n  }\n]\n'
const fn$g=(root,params)=>{if(!Array.isArray(params.attributes)&&!params.attribute){console.error(ENOCLS$1)
return null}const attributes=params.attributes||[params.attribute]
return{element:{enter:(node,parentNode)=>{if(node.name==="svg"&&parentNode.type==="root")for(const attribute of attributes){typeof attribute==="string"&&node.attributes[attribute]==null&&(node.attributes[attribute]=void 0)
if(typeof attribute==="object")for(const key of Object.keys(attribute))node.attributes[key]==null&&(node.attributes[key]=attribute[key])}}}}}
var addAttributesToSVGElement=Object.freeze({__proto__:null,description:description$g,fn:fn$g,name:name$g})
const name$f="addClassesToSVGElement"
const description$f="adds classnames to an outer <svg> element"
var ENOCLS='Error in plugin "addClassesToSVGElement": absent parameters.\nIt should have a list of classes in "classNames" or one "className".\nConfig example:\n\nplugins: [\n  {\n    name: "addClassesToSVGElement",\n    params: {\n      className: "mySvg"\n    }\n  }\n]\n\nplugins: [\n  {\n    name: "addClassesToSVGElement",\n    params: {\n      classNames: ["mySvg", "size-big"]\n    }\n  }\n]\n'
const fn$f=(root,params,info)=>{if(!(Array.isArray(params.classNames)&&params.classNames.length!==0)&&!params.className){console.error(ENOCLS)
return null}const classNames=params.classNames||[params.className]
return{element:{enter:(node,parentNode)=>{if(node.name==="svg"&&parentNode.type==="root"){const classList=new Set(node.attributes.class==null?null:node.attributes.class.split(" "))
for(const className of classNames)if(className!=null){const classToAdd=typeof className==="string"?className:className(node,info)
classList.add(classToAdd)}node.attributes.class=Array.from(classList).join(" ")}}}}}
var addClassesToSVGElement=Object.freeze({__proto__:null,description:description$f,fn:fn$f,name:name$f})
const name$e="cleanupListOfValues"
const description$e="rounds list of values to the fixed precision"
const regNumericValues=/^([-+]?\d*\.?\d+([eE][-+]?\d+)?)(px|pt|pc|mm|cm|m|in|ft|em|ex|%)?$/
const regSeparator=/\s+,?\s*|,\s*/
const absoluteLengths={cm:96/2.54,mm:96/25.4,in:96,pt:4/3,pc:16,px:1}
const fn$e=(_root,params)=>{const{floatPrecision:floatPrecision=3,leadingZero:leadingZero=true,defaultPx:defaultPx=true,convertToPx:convertToPx=true}=params
const roundValues=lists=>{const roundedList=[]
for(const elem of lists.split(regSeparator)){const match=elem.match(regNumericValues)
const matchNew=elem.match(/new/)
if(match){let num=Number(Number(match[1]).toFixed(floatPrecision))
let matchedUnit=match[3]||""
let units=matchedUnit
if(convertToPx&&units&&units in absoluteLengths){const pxNum=Number((absoluteLengths[units]*Number(match[1])).toFixed(floatPrecision))
if(pxNum.toString().length<match[0].length){num=pxNum
units="px"}}let str
str=leadingZero?removeLeadingZero(num):num.toString()
defaultPx&&units==="px"&&(units="")
roundedList.push(str+units)}else matchNew?roundedList.push("new"):elem&&roundedList.push(elem)}return roundedList.join(" ")}
return{element:{enter:node=>{node.attributes.points!=null&&(node.attributes.points=roundValues(node.attributes.points))
node.attributes["enable-background"]!=null&&(node.attributes["enable-background"]=roundValues(node.attributes["enable-background"]))
node.attributes.viewBox!=null&&(node.attributes.viewBox=roundValues(node.attributes.viewBox))
node.attributes["stroke-dasharray"]!=null&&(node.attributes["stroke-dasharray"]=roundValues(node.attributes["stroke-dasharray"]))
node.attributes.dx!=null&&(node.attributes.dx=roundValues(node.attributes.dx))
node.attributes.dy!=null&&(node.attributes.dy=roundValues(node.attributes.dy))
node.attributes.x!=null&&(node.attributes.x=roundValues(node.attributes.x))
node.attributes.y!=null&&(node.attributes.y=roundValues(node.attributes.y))}}}}
var cleanupListOfValues=Object.freeze({__proto__:null,description:description$e,fn:fn$e,name:name$e})
const name$d="convertOneStopGradients"
const description$d="converts one-stop (single color) gradients to a plain color"
const fn$d=root=>{const stylesheet=collectStylesheet(root)
const effectedDefs=new Set
const allDefs=new Map
const gradientsToDetach=new Map
let xlinkHrefCount=0
return{element:{enter:(node,parentNode)=>{node.attributes["xlink:href"]!=null&&xlinkHrefCount++
if(node.name==="defs"){allDefs.set(node,parentNode)
return}if(node.name!=="linearGradient"&&node.name!=="radialGradient")return
const stops=node.children.filter((child=>child.type==="element"&&child.name==="stop"))
const href=node.attributes["xlink:href"]||node.attributes["href"]
let effectiveNode=stops.length===0&&href!=null&&href.startsWith("#")?querySelector(root,href):node
if(effectiveNode==null||effectiveNode.type!=="element"){gradientsToDetach.set(node,parentNode)
return}const effectiveStops=effectiveNode.children.filter((child=>child.type==="element"&&child.name==="stop"))
if(effectiveStops.length!==1||effectiveStops[0].type!=="element")return
parentNode.type==="element"&&parentNode.name==="defs"&&effectedDefs.add(parentNode)
gradientsToDetach.set(node,parentNode)
let color
const style=computeStyle(stylesheet,effectiveStops[0])["stop-color"]
style!=null&&style.type==="static"&&(color=style.value)
const selectorVal=`url(#${node.attributes.id})`
const selector=[...colorsProps].map((attr=>`[${attr}="${selectorVal}"]`)).join(",")
const elements=querySelectorAll(root,selector)
for(const element of elements){if(element.type!=="element")continue
for(const attr of colorsProps){if(element.attributes[attr]!==selectorVal)continue
color!=null?element.attributes[attr]=color:delete element.attributes[attr]}}const styledElements=querySelectorAll(root,`[style*=${selectorVal}]`)
for(const element of styledElements){if(element.type!=="element")continue
element.attributes.style=element.attributes.style.replace(selectorVal,color||attrsGroupsDefaults.presentation["stop-color"])}},exit:node=>{if(node.name==="svg"){for(const[gradient,parent]of gradientsToDetach.entries()){gradient.attributes["xlink:href"]!=null&&xlinkHrefCount--
detachNodeFromParent(gradient,parent)}xlinkHrefCount===0&&delete node.attributes["xmlns:xlink"]
for(const[defs,parent]of allDefs.entries())effectedDefs.has(defs)&&defs.children.length===0&&detachNodeFromParent(defs,parent)}}}}}
var convertOneStopGradients=Object.freeze({__proto__:null,description:description$d,fn:fn$d,name:name$d})
const name$c="convertStyleToAttrs"
const description$c="converts style to attributes"
const g=(...args)=>"(?:"+args.join("|")+")"
const stylingProps=attrsGroups.presentation
const rEscape="\\\\(?:[0-9a-f]{1,6}\\s?|\\r\\n|.)"
const rAttr="\\s*("+g("[^:;\\\\]",rEscape)+"*?)\\s*"
const rSingleQuotes="'(?:[^'\\n\\r\\\\]|"+rEscape+")*?(?:'|$)"
const rQuotes='"(?:[^"\\n\\r\\\\]|'+rEscape+')*?(?:"|$)'
const rQuotedString=new RegExp("^"+g(rSingleQuotes,rQuotes)+"$")
const rParenthesis="\\("+g("[^'\"()\\\\]+",rEscape,rSingleQuotes,rQuotes)+"*?\\)"
const rValue="\\s*("+g("[^!'\"();\\\\]+?",rEscape,rSingleQuotes,rQuotes,rParenthesis,"[^;]*?")+"*?)"
const rDeclEnd="\\s*(?:;\\s*|$)"
const rImportant="(\\s*!important(?![-(\\w]))?"
const regDeclarationBlock=new RegExp(rAttr+":"+rValue+rImportant+rDeclEnd,"ig")
const regStripComments=new RegExp(g(rEscape,rSingleQuotes,rQuotes,"/\\*[^]*?\\*/"),"ig")
const fn$c=(_root,params)=>{const{keepImportant:keepImportant=false}=params
return{element:{enter:node=>{if(node.attributes.style!=null){let styles=[]
const newAttributes={}
const styleValue=node.attributes.style.replace(regStripComments,(match=>match[0]=="/"?"":match[0]=="\\"&&/[-g-z]/i.test(match[1])?match[1]:match))
regDeclarationBlock.lastIndex=0
for(var rule;rule=regDeclarationBlock.exec(styleValue);)keepImportant&&rule[3]||styles.push([rule[1],rule[2]])
if(styles.length){styles=styles.filter((function(style){if(style[0]){var prop=style[0].toLowerCase(),val=style[1]
rQuotedString.test(val)&&(val=val.slice(1,-1))
if(stylingProps.has(prop)){newAttributes[prop]=val
return false}}return true}))
Object.assign(node.attributes,newAttributes)
styles.length?node.attributes.style=styles.map((declaration=>declaration.join(":"))).join(";"):delete node.attributes.style}}}}}}
var convertStyleToAttrs=Object.freeze({__proto__:null,description:description$c,fn:fn$c,name:name$c})
const name$b="prefixIds"
const description$b="prefix IDs"
const getBasename=path=>{const matched=/[/\\]?([^/\\]+)$/.exec(path)
if(matched)return matched[1]
return""}
const escapeIdentifierName=str=>str.replace(/[. ]/g,"_")
const unquote=string=>{if(string.startsWith('"')&&string.endsWith('"')||string.startsWith("'")&&string.endsWith("'"))return string.slice(1,-1)
return string}
const prefixId=(prefixGenerator,body)=>{const prefix=prefixGenerator(body)
if(body.startsWith(prefix))return body
return prefix+body}
const prefixReference=(prefixGenerator,reference)=>{if(reference.startsWith("#"))return"#"+prefixId(prefixGenerator,reference.slice(1))
return null}
const generatePrefix=(body,node,info,prefixGenerator,delim,history)=>{if(typeof prefixGenerator==="function"){let prefix=history.get(body)
if(prefix!=null)return prefix
prefix=prefixGenerator(node,info)+delim
history.set(body,prefix)
return prefix}if(typeof prefixGenerator==="string")return prefixGenerator+delim
if(prefixGenerator===false)return""
if(info.path!=null&&info.path.length>0)return escapeIdentifierName(getBasename(info.path))+delim
return"prefix"+delim}
const fn$b=(_root,params,info)=>{const{delim:delim="__",prefix:prefix,prefixIds:prefixIds=true,prefixClassNames:prefixClassNames=true}=params
const prefixMap=new Map
return{element:{enter:node=>{const prefixGenerator=id=>generatePrefix(id,node,info,prefix,delim,prefixMap)
if(node.name==="style"){if(node.children.length===0)return
for(const child of node.children){if(child.type!=="text"&&child.type!=="cdata")continue
const cssText=child.value
let cssAst=null
try{cssAst=csstree__namespace.parse(cssText,{parseValue:true,parseCustomProperty:false})}catch{return}csstree__namespace.walk(cssAst,(node=>{if(prefixIds&&node.type==="IdSelector"||prefixClassNames&&node.type==="ClassSelector"){node.name=prefixId(prefixGenerator,node.name)
return}if(node.type==="Url"&&node.value.length>0){const prefixed=prefixReference(prefixGenerator,unquote(node.value))
prefixed!=null&&(node.value=prefixed)}}))
child.value=csstree__namespace.generate(cssAst)}}prefixIds&&node.attributes.id!=null&&node.attributes.id.length!==0&&(node.attributes.id=prefixId(prefixGenerator,node.attributes.id))
prefixClassNames&&node.attributes.class!=null&&node.attributes.class.length!==0&&(node.attributes.class=node.attributes.class.split(/\s+/).map((name=>prefixId(prefixGenerator,name))).join(" "))
for(const name of["href","xlink:href"])if(node.attributes[name]!=null&&node.attributes[name].length!==0){const prefixed=prefixReference(prefixGenerator,node.attributes[name])
prefixed!=null&&(node.attributes[name]=prefixed)}for(const name of referencesProps)node.attributes[name]!=null&&node.attributes[name].length!==0&&(node.attributes[name]=node.attributes[name].replace(/\burl\((["'])?(#.+?)\1\)/gi,((match,_,url)=>{const prefixed=prefixReference(prefixGenerator,url)
if(prefixed==null)return match
return`url(${prefixed})`})))
for(const name of["begin","end"])if(node.attributes[name]!=null&&node.attributes[name].length!==0){const parts=node.attributes[name].split(/\s*;\s+/).map((val=>{if(val.endsWith(".end")||val.endsWith(".start")){const[id,postfix]=val.split(".")
return`${prefixId(prefixGenerator,id)}.${postfix}`}return val}))
node.attributes[name]=parts.join("; ")}}}}}
var prefixIds=Object.freeze({__proto__:null,description:description$b,fn:fn$b,name:name$b})
const name$a="removeAttributesBySelector"
const description$a="removes attributes of elements that match a css selector"
const fn$a=(root,params)=>{const selectors=Array.isArray(params.selectors)?params.selectors:[params]
for(const{selector:selector,attributes:attributes}of selectors){const nodes=querySelectorAll(root,selector)
for(const node of nodes)if(node.type==="element")if(Array.isArray(attributes))for(const name of attributes)delete node.attributes[name]
else delete node.attributes[attributes]}return{}}
var removeAttributesBySelector=Object.freeze({__proto__:null,description:description$a,fn:fn$a,name:name$a})
const name$9="removeAttrs"
const description$9="removes specified attributes"
const DEFAULT_SEPARATOR=":"
const ENOATTRS='Warning: The plugin "removeAttrs" requires the "attrs" parameter.\nIt should have a pattern to remove, otherwise the plugin is a noop.\nConfig example:\n\nplugins: [\n  {\n    name: "removeAttrs",\n    params: {\n      attrs: "(fill|stroke)"\n    }\n  }\n]\n'
const fn$9=(root,params)=>{if(typeof params.attrs=="undefined"){console.warn(ENOATTRS)
return null}const elemSeparator=typeof params.elemSeparator=="string"?params.elemSeparator:DEFAULT_SEPARATOR
const preserveCurrentColor=typeof params.preserveCurrentColor=="boolean"&&params.preserveCurrentColor
const attrs=Array.isArray(params.attrs)?params.attrs:[params.attrs]
return{element:{enter:node=>{for(let pattern of attrs){pattern.includes(elemSeparator)?pattern.split(elemSeparator).length<3&&(pattern=[pattern,".*"].join(elemSeparator)):pattern=[".*",pattern,".*"].join(elemSeparator)
const list=pattern.split(elemSeparator).map((value=>{value==="*"&&(value=".*")
return new RegExp(["^",value,"$"].join(""),"i")}))
if(list[0].test(node.name))for(const[name,value]of Object.entries(node.attributes)){const isCurrentColor=value.toLowerCase()==="currentcolor"
const isFillCurrentColor=preserveCurrentColor&&name=="fill"&&isCurrentColor
const isStrokeCurrentColor=preserveCurrentColor&&name=="stroke"&&isCurrentColor
!isFillCurrentColor&&!isStrokeCurrentColor&&list[1].test(name)&&list[2].test(value)&&delete node.attributes[name]}}}}}}
var removeAttrs=Object.freeze({__proto__:null,description:description$9,fn:fn$9,name:name$9})
const name$8="removeDimensions"
const description$8="removes width and height in presence of viewBox (opposite to removeViewBox, disable it first)"
const fn$8=()=>({element:{enter:node=>{if(node.name==="svg")if(node.attributes.viewBox!=null){delete node.attributes.width
delete node.attributes.height}else if(node.attributes.width!=null&&node.attributes.height!=null&&Number.isNaN(Number(node.attributes.width))===false&&Number.isNaN(Number(node.attributes.height))===false){const width=Number(node.attributes.width)
const height=Number(node.attributes.height)
node.attributes.viewBox=`0 0 ${width} ${height}`
delete node.attributes.width
delete node.attributes.height}}}})
var removeDimensions=Object.freeze({__proto__:null,description:description$8,fn:fn$8,name:name$8})
const name$7="removeElementsByAttr"
const description$7="removes arbitrary elements by ID or className (disabled by default)"
const fn$7=(root,params)=>{const ids=params.id==null?[]:Array.isArray(params.id)?params.id:[params.id]
const classes=params.class==null?[]:Array.isArray(params.class)?params.class:[params.class]
return{element:{enter:(node,parentNode)=>{node.attributes.id!=null&&ids.length!==0&&ids.includes(node.attributes.id)&&detachNodeFromParent(node,parentNode)
if(node.attributes.class&&classes.length!==0){const classList=node.attributes.class.split(" ")
for(const item of classes)if(classList.includes(item)){detachNodeFromParent(node,parentNode)
break}}}}}}
var removeElementsByAttr=Object.freeze({__proto__:null,description:description$7,fn:fn$7,name:name$7})
const name$6="removeOffCanvasPaths"
const description$6="removes elements that are drawn outside of the viewbox (disabled by default)"
const fn$6=()=>{let viewBoxData=null
return{element:{enter:(node,parentNode)=>{if(node.name==="svg"&&parentNode.type==="root"){let viewBox=""
node.attributes.viewBox!=null?viewBox=node.attributes.viewBox:node.attributes.height!=null&&node.attributes.width!=null&&(viewBox=`0 0 ${node.attributes.width} ${node.attributes.height}`)
viewBox=viewBox.replace(/[,+]|px/g," ").replace(/\s+/g," ").replace(/^\s*|\s*$/g,"")
const m=/^(-?\d*\.?\d+) (-?\d*\.?\d+) (\d*\.?\d+) (\d*\.?\d+)$/.exec(viewBox)
if(m==null)return
const left=Number.parseFloat(m[1])
const top=Number.parseFloat(m[2])
const width=Number.parseFloat(m[3])
const height=Number.parseFloat(m[4])
viewBoxData={left:left,top:top,right:left+width,bottom:top+height,width:width,height:height}}if(node.attributes.transform!=null)return visitSkip
if(node.name==="path"&&node.attributes.d!=null&&viewBoxData!=null){const pathData=parsePathData(node.attributes.d)
let visible=false
for(const pathDataItem of pathData)if(pathDataItem.command==="M"){const[x,y]=pathDataItem.args
x>=viewBoxData.left&&x<=viewBoxData.right&&y>=viewBoxData.top&&y<=viewBoxData.bottom&&(visible=true)}if(visible)return
pathData.length===2&&pathData.push({command:"z",args:[]})
const{left:left,top:top,width:width,height:height}=viewBoxData
const viewBoxPathData=[{command:"M",args:[left,top]},{command:"h",args:[width]},{command:"v",args:[height]},{command:"H",args:[left]},{command:"z",args:[]}]
intersects(viewBoxPathData,pathData)===false&&detachNodeFromParent(node,parentNode)}}}}}
var removeOffCanvasPaths=Object.freeze({__proto__:null,description:description$6,fn:fn$6,name:name$6})
const name$5="removeRasterImages"
const description$5="removes raster images (disabled by default)"
const fn$5=()=>({element:{enter:(node,parentNode)=>{node.name==="image"&&node.attributes["xlink:href"]!=null&&/(\.|image\/)(jpe?g|png|gif)/.test(node.attributes["xlink:href"])&&detachNodeFromParent(node,parentNode)}}})
var removeRasterImages=Object.freeze({__proto__:null,description:description$5,fn:fn$5,name:name$5})
const name$4="removeScriptElement"
const description$4="removes scripts (disabled by default)"
const eventAttrs=[...attrsGroups.animationEvent,...attrsGroups.documentEvent,...attrsGroups.documentElementEvent,...attrsGroups.globalEvent,...attrsGroups.graphicalEvent]
const fn$4=()=>({element:{enter:(node,parentNode)=>{if(node.name==="script"){detachNodeFromParent(node,parentNode)
return}for(const attr of eventAttrs)node.attributes[attr]!=null&&delete node.attributes[attr]},exit:(node,parentNode)=>{if(node.name!=="a")return
for(const attr of Object.keys(node.attributes))if(attr==="href"||attr.endsWith(":href")){if(node.attributes[attr]==null||!node.attributes[attr].trimStart().startsWith("javascript:"))continue
const index=parentNode.children.indexOf(node)
const usefulChildren=node.children.filter((child=>!(child.type==="text"&&/\s*/.test(child.value))))
parentNode.children.splice(index,1,...usefulChildren)
for(const child of node.children)Object.defineProperty(child,"parentNode",{writable:true,value:parentNode})}}}})
var removeScriptElement=Object.freeze({__proto__:null,description:description$4,fn:fn$4,name:name$4})
const name$3="removeStyleElement"
const description$3="removes <style> element (disabled by default)"
const fn$3=()=>({element:{enter:(node,parentNode)=>{node.name==="style"&&detachNodeFromParent(node,parentNode)}}})
var removeStyleElement=Object.freeze({__proto__:null,description:description$3,fn:fn$3,name:name$3})
const name$2="removeXlink"
const description$2="remove xlink namespace and replaces attributes with the SVG 2 equivalent where applicable"
const XLINK_NAMESPACE="http://www.w3.org/1999/xlink"
const SHOW_TO_TARGET={new:"_blank",replace:"_self"}
const LEGACY_ELEMENTS=new Set(["cursor","filter","font-face-uri","glyphRef","tref"])
const findPrefixedAttrs=(node,prefixes,attr)=>prefixes.map((prefix=>`${prefix}:${attr}`)).filter((attr=>node.attributes[attr]!=null))
const fn$2=(_,params)=>{const{includeLegacy:includeLegacy}=params
const xlinkPrefixes=[]
const overriddenPrefixes=[]
const usedInLegacyElement=[]
return{element:{enter:node=>{for(const[key,value]of Object.entries(node.attributes))if(key.startsWith("xmlns:")){const prefix=key.split(":",2)[1]
if(value===XLINK_NAMESPACE){xlinkPrefixes.push(prefix)
continue}xlinkPrefixes.includes(prefix)&&overriddenPrefixes.push(prefix)}if(overriddenPrefixes.some((prefix=>xlinkPrefixes.includes(prefix))))return
const showAttrs=findPrefixedAttrs(node,xlinkPrefixes,"show")
let showHandled=node.attributes.target!=null
for(let i=showAttrs.length-1;i>=0;i--){const attr=showAttrs[i]
const value=node.attributes[attr]
const mapping=SHOW_TO_TARGET[value]
if(showHandled||mapping==null){delete node.attributes[attr]
continue}mapping!==elems[node.name]?.defaults?.target&&(node.attributes.target=mapping)
delete node.attributes[attr]
showHandled=true}const titleAttrs=findPrefixedAttrs(node,xlinkPrefixes,"title")
for(let i=titleAttrs.length-1;i>=0;i--){const attr=titleAttrs[i]
const value=node.attributes[attr]
const hasTitle=node.children.filter((child=>child.type==="element"&&child.name==="title"))
if(hasTitle.length>0){delete node.attributes[attr]
continue}const titleTag={type:"element",name:"title",attributes:{},children:[{type:"text",value:value}]}
Object.defineProperty(titleTag,"parentNode",{writable:true,value:node})
node.children.unshift(titleTag)
delete node.attributes[attr]}const hrefAttrs=findPrefixedAttrs(node,xlinkPrefixes,"href")
if(hrefAttrs.length>0&&LEGACY_ELEMENTS.has(node.name)&&!includeLegacy){hrefAttrs.map((attr=>attr.split(":",1)[0])).forEach((prefix=>usedInLegacyElement.push(prefix)))
return}for(let i=hrefAttrs.length-1;i>=0;i--){const attr=hrefAttrs[i]
const value=node.attributes[attr]
if(node.attributes.href!=null){delete node.attributes[attr]
continue}node.attributes.href=value
delete node.attributes[attr]}},exit:node=>{for(const[key,value]of Object.entries(node.attributes)){const[prefix,attr]=key.split(":",2)
if(xlinkPrefixes.includes(prefix)&&!overriddenPrefixes.includes(prefix)&&!usedInLegacyElement.includes(prefix)&&!includeLegacy){delete node.attributes[key]
continue}if(key.startsWith("xmlns:")&&!usedInLegacyElement.includes(attr)){if(value===XLINK_NAMESPACE){const index=xlinkPrefixes.indexOf(attr)
xlinkPrefixes.splice(index,1)
delete node.attributes[key]
continue}if(overriddenPrefixes.includes(prefix)){const index=overriddenPrefixes.indexOf(attr)
overriddenPrefixes.splice(index,1)}}}}}}}
var removeXlink=Object.freeze({__proto__:null,description:description$2,fn:fn$2,name:name$2})
const name$1="removeXMLNS"
const description$1="removes xmlns attribute (for inline svg, disabled by default)"
const fn$1=()=>({element:{enter:node=>{node.name==="svg"&&delete node.attributes.xmlns}}})
var removeXMLNS=Object.freeze({__proto__:null,description:description$1,fn:fn$1,name:name$1})
const name="reusePaths"
const description="Finds <path> elements with the same d, fill, and stroke, and converts them to <use> elements referencing a single <path> def."
const fn=root=>{const stylesheet=collectStylesheet(root)
const paths=new Map
let svgDefs
const hrefs=new Set
return{element:{enter:(node,parentNode)=>{if(node.name==="path"&&node.attributes.d!=null){const d=node.attributes.d
const fill=node.attributes.fill||""
const stroke=node.attributes.stroke||""
const key=d+";s:"+stroke+";f:"+fill
let list=paths.get(key)
if(list==null){list=[]
paths.set(key,list)}list.push(node)}svgDefs==null&&node.name==="defs"&&parentNode.type==="element"&&parentNode.name==="svg"&&(svgDefs=node)
if(node.name==="use")for(const name of["href","xlink:href"]){const href=node.attributes[name]
href!=null&&href.startsWith("#")&&href.length>1&&hrefs.add(href.slice(1))}},exit:(node,parentNode)=>{if(node.name==="svg"&&parentNode.type==="root"){let defsTag=svgDefs
if(defsTag==null){defsTag={type:"element",name:"defs",attributes:{},children:[]}
Object.defineProperty(defsTag,"parentNode",{writable:true,value:node})}let index=0
for(const list of paths.values())if(list.length>1){const reusablePath={type:"element",name:"path",attributes:{},children:[]}
for(const attr of["fill","stroke","d"])list[0].attributes[attr]!=null&&(reusablePath.attributes[attr]=list[0].attributes[attr])
const originalId=list[0].attributes.id
if(originalId==null||hrefs.has(originalId)||stylesheet.rules.some((rule=>rule.selector===`#${originalId}`)))reusablePath.attributes.id="reuse-"+index++
else{reusablePath.attributes.id=originalId
delete list[0].attributes.id}Object.defineProperty(reusablePath,"parentNode",{writable:true,value:defsTag})
defsTag.children.push(reusablePath)
for(const pathNode of list){delete pathNode.attributes.d
delete pathNode.attributes.stroke
delete pathNode.attributes.fill
if(defsTag.children.includes(pathNode)&&pathNode.children.length===0){if(Object.keys(pathNode.attributes).length===0){detachNodeFromParent(pathNode,defsTag)
continue}if(Object.keys(pathNode.attributes).length===1&&pathNode.attributes.id!=null){detachNodeFromParent(pathNode,defsTag)
const selector=`[xlink\\:href=#${pathNode.attributes.id}], [href=#${pathNode.attributes.id}]`
for(const child of querySelectorAll(node,selector)){if(child.type!=="element")continue
for(const name of["href","xlink:href"])child.attributes[name]!=null&&(child.attributes[name]="#"+reusablePath.attributes.id)}continue}}pathNode.name="use"
pathNode.attributes["xlink:href"]="#"+reusablePath.attributes.id}}if(defsTag.children.length!==0){node.attributes["xmlns:xlink"]==null&&(node.attributes["xmlns:xlink"]="http://www.w3.org/1999/xlink")
svgDefs==null&&node.children.unshift(defsTag)}}}}}}
var reusePaths=Object.freeze({__proto__:null,description:description,fn:fn,name:name})
const builtin=[presetDefault,addAttributesToSVGElement,addClassesToSVGElement,cleanupAttrs,cleanupEnableBackground,cleanupIds,cleanupListOfValues,cleanupNumericValues,collapseGroups,convertColors,convertEllipseToCircle,convertOneStopGradients,convertPathData,convertShapeToPath,convertStyleToAttrs,convertTransform$1,mergeStyles,inlineStyles,mergePaths,minifyStyles,moveElemsAttrsToGroup,moveGroupAttrsToElems,prefixIds,removeAttributesBySelector,removeAttrs,removeComments,removeDeprecatedAttrs,removeDesc,removeDimensions,removeDoctype,removeEditorsNSData,removeElementsByAttr,removeEmptyAttrs,removeEmptyContainers,removeEmptyText,removeHiddenElems,removeMetadata,removeNonInheritableGroupAttrs,removeOffCanvasPaths,removeRasterImages,removeScriptElement,removeStyleElement,removeTitle,removeUnknownsAndDefaults,removeUnusedNS,removeUselessDefs,removeUselessStrokeAndFill,removeViewBox,removeXlink,removeXMLNS,removeXMLProcInst,reusePaths,sortAttrs,sortDefsChildren]
const pluginsMap={}
for(const plugin of builtin)pluginsMap[plugin.name]=plugin
const resolvePluginConfig=plugin=>{if(typeof plugin==="string"){const builtinPlugin=pluginsMap[plugin]
if(builtinPlugin==null)throw Error(`Unknown builtin plugin "${plugin}" specified.`)
return{name:plugin,params:{},fn:builtinPlugin.fn}}if(typeof plugin==="object"&&plugin!=null){if(plugin.name==null)throw Error("Plugin name should be specified")
let fn=plugin.fn
if(fn==null){const builtinPlugin=pluginsMap[plugin.name]
if(builtinPlugin==null)throw Error(`Unknown builtin plugin "${plugin.name}" specified.`)
fn=builtinPlugin.fn}return{name:plugin.name,params:plugin.params,fn:fn}}return null}
const optimize$1=(input,config)=>{config==null&&(config={})
if(typeof config!=="object")throw Error("Config should be an object")
const maxPassCount=config.multipass?10:1
let prevResultSize=Number.POSITIVE_INFINITY
let output=""
const info={}
config.path!=null&&(info.path=config.path)
for(let i=0;i<maxPassCount;i+=1){info.multipassCount=i
const ast=parseSvg(input,config.path)
const plugins=config.plugins||["preset-default"]
if(!Array.isArray(plugins))throw Error("malformed config, `plugins` property must be an array.\nSee more info here: https://github.com/svg/svgo#configuration")
const resolvedPlugins=plugins.filter((plugin=>plugin!=null)).map(resolvePluginConfig)
resolvedPlugins.length<plugins.length&&console.warn("Warning: plugins list includes null or undefined elements, these will be ignored.")
const globalOverrides={}
config.floatPrecision!=null&&(globalOverrides.floatPrecision=config.floatPrecision)
invokePlugins(ast,info,resolvedPlugins,null,globalOverrides)
output=stringifySvg(ast,config.js2svg)
if(!(output.length<prevResultSize))break
input=output
prevResultSize=output.length}config.datauri&&(output=encodeSVGDatauri(output,config.datauri))
return{data:output}}
const importConfig=async configFile=>{const imported=await import(url.pathToFileURL(configFile))
const config=imported.default
if(config==null||typeof config!=="object"||Array.isArray(config))throw Error(`Invalid config file "${configFile}"`)
return config}
const isFile=async file=>{try{const stats=await fs.promises.stat(file)
return stats.isFile()}catch{return false}}
const loadConfig=async(configFile,cwd=process.cwd())=>{if(configFile!=null)return path.isAbsolute(configFile)?await importConfig(configFile):await importConfig(path.join(cwd,configFile))
let dir=cwd
while(true){const js=path.join(dir,"svgo.config.js")
if(await isFile(js))return await importConfig(js)
const mjs=path.join(dir,"svgo.config.mjs")
if(await isFile(mjs))return await importConfig(mjs)
const cjs=path.join(dir,"svgo.config.cjs")
if(await isFile(cjs))return await importConfig(cjs)
const parent=path.dirname(dir)
if(dir===parent)return null
dir=parent}}
const optimize=(input,config)=>{config==null&&(config={})
if(typeof config!=="object")throw Error("Config should be an object")
return optimize$1(input,{...config,js2svg:{eol:os.EOL==="\r\n"?"crlf":"lf",...config.js2svg}})}
exports.loadConfig=loadConfig
exports.optimize=optimize
