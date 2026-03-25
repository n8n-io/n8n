/*
Language: RenderMan RIB
Author: Konstantin Evdokimenko <qewerty@gmail.com>
Contributors: Shuen-Huei Guan <drake.guan@gmail.com>
Website: https://renderman.pixar.com/resources/RenderMan_20/ribBinding.html
Category: graphics
*/

function rib(hljs) {
  return {
    name: 'RenderMan RIB',
    keywords:
      'ArchiveRecord AreaLightSource Atmosphere Attribute AttributeBegin AttributeEnd Basis '
      + 'Begin Blobby Bound Clipping ClippingPlane Color ColorSamples ConcatTransform Cone '
      + 'CoordinateSystem CoordSysTransform CropWindow Curves Cylinder DepthOfField Detail '
      + 'DetailRange Disk Displacement Display End ErrorHandler Exposure Exterior Format '
      + 'FrameAspectRatio FrameBegin FrameEnd GeneralPolygon GeometricApproximation Geometry '
      + 'Hider Hyperboloid Identity Illuminate Imager Interior LightSource '
      + 'MakeCubeFaceEnvironment MakeLatLongEnvironment MakeShadow MakeTexture Matte '
      + 'MotionBegin MotionEnd NuPatch ObjectBegin ObjectEnd ObjectInstance Opacity Option '
      + 'Orientation Paraboloid Patch PatchMesh Perspective PixelFilter PixelSamples '
      + 'PixelVariance Points PointsGeneralPolygons PointsPolygons Polygon Procedural Projection '
      + 'Quantize ReadArchive RelativeDetail ReverseOrientation Rotate Scale ScreenWindow '
      + 'ShadingInterpolation ShadingRate Shutter Sides Skew SolidBegin SolidEnd Sphere '
      + 'SubdivisionMesh Surface TextureCoordinates Torus Transform TransformBegin TransformEnd '
      + 'TransformPoints Translate TrimCurve WorldBegin WorldEnd',
    illegal: '</',
    contains: [
      hljs.HASH_COMMENT_MODE,
      hljs.C_NUMBER_MODE,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE
    ]
  };
}

module.exports = rib;
