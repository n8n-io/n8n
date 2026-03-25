
//#region src/Splitter/utils/rects.ts
function intersects(rectOne, rectTwo, strict) {
	if (strict) return rectOne.x < rectTwo.x + rectTwo.width && rectOne.x + rectOne.width > rectTwo.x && rectOne.y < rectTwo.y + rectTwo.height && rectOne.y + rectOne.height > rectTwo.y;
	else return rectOne.x <= rectTwo.x + rectTwo.width && rectOne.x + rectOne.width >= rectTwo.x && rectOne.y <= rectTwo.y + rectTwo.height && rectOne.y + rectOne.height >= rectTwo.y;
}

//#endregion
Object.defineProperty(exports, 'intersects', {
  enumerable: true,
  get: function () {
    return intersects;
  }
});
//# sourceMappingURL=rects.cjs.map