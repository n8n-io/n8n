'use strict'

/* const FIGURE = {
  INTERIOR_RING: 0x00,
  STROKE: 0x01,
  EXTERIOR_RING: 0x02
};

const FIGURE_V2 = {
  POINT: 0x00,
  LINE: 0x01,
  ARC: 0x02,
  COMPOSITE_CURVE: 0x03
};

const SHAPE = {
  POINT: 0x01,
  LINESTRING: 0x02,
  POLYGON: 0x03,
  MULTIPOINT: 0x04,
  MULTILINESTRING: 0x05,
  MULTIPOLYGON: 0x06,
  GEOMETRY_COLLECTION: 0x07
};

const SHAPE_V2 = {
  POINT: 0x01,
  LINESTRING: 0x02,
  POLYGON: 0x03,
  MULTIPOINT: 0x04,
  MULTILINESTRING: 0x05,
  MULTIPOLYGON: 0x06,
  GEOMETRY_COLLECTION: 0x07,
  CIRCULAR_STRING: 0x08,
  COMPOUND_CURVE: 0x09,
  CURVE_POLYGON: 0x0A,
  FULL_GLOBE: 0x0B
};

const SEGMENT = {
  LINE: 0x00,
  ARC: 0x01,
  FIRST_LINE: 0x02,
  FIRST_ARC: 0x03
}; */

class Point {
  constructor () {
    this.x = 0
    this.y = 0
    this.z = null
    this.m = null
  }
}

const parsePoints = (buffer, count, isGeometryPoint) => {
  // s2.1.5 + s2.1.6
  // The key distinction for parsing is that a GEOGRAPHY POINT is ordered Lat (y) then Long (x),
  // while a GEOMETRY POINT is ordered x then y.
  // Further, there are additional range constraints on GEOGRAPHY POINT that are useful for testing that the coordinate order has not been flipped, such as that Lat must be in the range [-90, +90].

  const points = []
  if (count < 1) {
    return points
  }

  if (isGeometryPoint) {
    // GEOMETRY POINT (s2.1.6): x then y.
    for (let i = 1; i <= count; i++) {
      const point = new Point()
      points.push(point)
      point.x = buffer.readDoubleLE(buffer.position)
      point.y = buffer.readDoubleLE(buffer.position + 8)
      buffer.position += 16
    }
  } else {
    // GEOGRAPHY POINT (s2.1.5): Lat (y) then Long (x).
    for (let i = 1; i <= count; i++) {
      const point = new Point()
      points.push(point)
      point.lat = buffer.readDoubleLE(buffer.position)
      point.lng = buffer.readDoubleLE(buffer.position + 8)

      // For backwards compatibility, preserve the coordinate inversion in x and y.
      // A future breaking change likely eliminate x and y for geography points in favor of just the lat and lng fields, as they've proven marvelously confusing.
      // See discussion at: https://github.com/tediousjs/node-mssql/pull/1282#discussion_r677769531
      point.x = point.lat
      point.y = point.lng

      buffer.position += 16
    }
  }

  return points
}

const parseZ = (buffer, points) => {
  // s2.1.1 + s.2.1.2

  if (points < 1) {
    return
  }

  points.forEach(point => {
    point.z = buffer.readDoubleLE(buffer.position)
    buffer.position += 8
  })
}

const parseM = (buffer, points) => {
  // s2.1.1 + s.2.1.2

  if (points < 1) {
    return
  }

  points.forEach(point => {
    point.m = buffer.readDoubleLE(buffer.position)
    buffer.position += 8
  })
}

const parseFigures = (buffer, count, properties) => {
  // s2.1.3

  const figures = []
  if (count < 1) {
    return figures
  }

  if (properties.P) {
    figures.push({
      attribute: 0x01,
      pointOffset: 0
    })
  } else if (properties.L) {
    figures.push({
      attribute: 0x01,
      pointOffset: 0
    })
  } else {
    for (let i = 1; i <= count; i++) {
      figures.push({
        attribute: buffer.readUInt8(buffer.position),
        pointOffset: buffer.readInt32LE(buffer.position + 1)
      })

      buffer.position += 5
    }
  }

  return figures
}

const parseShapes = (buffer, count, properties) => {
  // s2.1.4

  const shapes = []
  if (count < 1) {
    return shapes
  }

  if (properties.P) {
    shapes.push({
      parentOffset: -1,
      figureOffset: 0,
      type: 0x01
    })
  } else if (properties.L) {
    shapes.push({
      parentOffset: -1,
      figureOffset: 0,
      type: 0x02
    })
  } else {
    for (let i = 1; i <= count; i++) {
      shapes.push({
        parentOffset: buffer.readInt32LE(buffer.position),
        figureOffset: buffer.readInt32LE(buffer.position + 4),
        type: buffer.readUInt8(buffer.position + 8)
      })

      buffer.position += 9
    }
  }

  return shapes
}

const parseSegments = (buffer, count) => {
  // s2.1.7

  const segments = []
  if (count < 1) {
    return segments
  }

  for (let i = 1; i <= count; i++) {
    segments.push({ type: buffer.readUInt8(buffer.position) })

    buffer.position++
  }

  return segments
}

const parseGeography = (buffer, isUsingGeometryPoints) => {
  // s2.1.1 + s.2.1.2

  const srid = buffer.readInt32LE(0)
  if (srid === -1) {
    return null
  }

  const value = {
    srid,
    version: buffer.readUInt8(4)
  }

  const flags = buffer.readUInt8(5)
  buffer.position = 6

  // console.log("srid", srid)
  // console.log("version", version)

  const properties = {
    Z: (flags & (1 << 0)) > 0,
    M: (flags & (1 << 1)) > 0,
    V: (flags & (1 << 2)) > 0,
    P: (flags & (1 << 3)) > 0,
    L: (flags & (1 << 4)) > 0
  }

  if (value.version === 2) {
    properties.H = (flags & (1 << 3)) > 0
  }

  // console.log("properties", properties);

  let numberOfPoints
  if (properties.P) {
    numberOfPoints = 1
  } else if (properties.L) {
    numberOfPoints = 2
  } else {
    numberOfPoints = buffer.readUInt32LE(buffer.position)
    buffer.position += 4
  }

  // console.log("numberOfPoints", numberOfPoints)

  value.points = parsePoints(buffer, numberOfPoints, isUsingGeometryPoints)

  if (properties.Z) {
    parseZ(buffer, value.points)
  }

  if (properties.M) {
    parseM(buffer, value.points)
  }

  // console.log("points", points)

  let numberOfFigures
  if (properties.P) {
    numberOfFigures = 1
  } else if (properties.L) {
    numberOfFigures = 1
  } else {
    numberOfFigures = buffer.readUInt32LE(buffer.position)
    buffer.position += 4
  }

  // console.log("numberOfFigures", numberOfFigures)

  value.figures = parseFigures(buffer, numberOfFigures, properties)

  // console.log("figures", figures)

  let numberOfShapes
  if (properties.P) {
    numberOfShapes = 1
  } else if (properties.L) {
    numberOfShapes = 1
  } else {
    numberOfShapes = buffer.readUInt32LE(buffer.position)
    buffer.position += 4
  }

  // console.log("numberOfShapes", numberOfShapes)

  value.shapes = parseShapes(buffer, numberOfShapes, properties)

  // console.log( "shapes", shapes)

  if (value.version === 2 && buffer.position < buffer.length) {
    const numberOfSegments = buffer.readUInt32LE(buffer.position)
    buffer.position += 4

    // console.log("numberOfSegments", numberOfSegments)

    value.segments = parseSegments(buffer, numberOfSegments)

    // console.log("segments", segments)
  } else {
    value.segments = []
  }

  return value
}

module.exports.PARSERS = {
  geography (buffer) {
    return parseGeography(buffer, /* isUsingGeometryPoints: */false)
  },

  geometry (buffer) {
    return parseGeography(buffer, /* isUsingGeometryPoints: */true)
  }
}
