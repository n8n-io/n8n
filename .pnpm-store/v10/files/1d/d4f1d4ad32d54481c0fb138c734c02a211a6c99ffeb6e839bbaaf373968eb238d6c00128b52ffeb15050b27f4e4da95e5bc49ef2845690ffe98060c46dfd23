export interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

export function intersects(
  rectOne: Rectangle,
  rectTwo: Rectangle,
  strict: boolean,
): boolean {
  if (strict) {
    return (
      rectOne.x < rectTwo.x + rectTwo.width
      && rectOne.x + rectOne.width > rectTwo.x
      && rectOne.y < rectTwo.y + rectTwo.height
      && rectOne.y + rectOne.height > rectTwo.y
    )
  }
  else {
    return (
      rectOne.x <= rectTwo.x + rectTwo.width
      && rectOne.x + rectOne.width >= rectTwo.x
      && rectOne.y <= rectTwo.y + rectTwo.height
      && rectOne.y + rectOne.height >= rectTwo.y
    )
  }
}

export function getIntersectingRectangle(
  rectOne: Rectangle,
  rectTwo: Rectangle,
  strict: boolean,
): Rectangle {
  if (!intersects(rectOne, rectTwo, strict)) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    }
  }

  return {
    x: Math.max(rectOne.x, rectTwo.x),
    y: Math.max(rectOne.y, rectTwo.y),
    width:
      Math.min(rectOne.x + rectOne.width, rectTwo.x + rectTwo.width)
      - Math.max(rectOne.x, rectTwo.x),
    height:
      Math.min(rectOne.y + rectOne.height, rectTwo.y + rectTwo.height)
      - Math.max(rectOne.y, rectTwo.y),
  }
}
