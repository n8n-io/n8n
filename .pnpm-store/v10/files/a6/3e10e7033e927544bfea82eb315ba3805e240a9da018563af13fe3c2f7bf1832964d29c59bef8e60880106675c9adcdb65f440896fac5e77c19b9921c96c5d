/*
Language: GLSL
Description: OpenGL Shading Language
Author: Sergey Tikhomirov <sergey@tikhomirov.io>
Website: https://en.wikipedia.org/wiki/OpenGL_Shading_Language
Category: graphics
*/

function glsl(hljs) {
  return {
    name: 'GLSL',
    keywords: {
      keyword:
        // Statements
        'break continue discard do else for if return while switch case default '
        // Qualifiers
        + 'attribute binding buffer ccw centroid centroid varying coherent column_major const cw '
        + 'depth_any depth_greater depth_less depth_unchanged early_fragment_tests equal_spacing '
        + 'flat fractional_even_spacing fractional_odd_spacing highp in index inout invariant '
        + 'invocations isolines layout line_strip lines lines_adjacency local_size_x local_size_y '
        + 'local_size_z location lowp max_vertices mediump noperspective offset origin_upper_left '
        + 'out packed patch pixel_center_integer point_mode points precise precision quads r11f_g11f_b10f '
        + 'r16 r16_snorm r16f r16i r16ui r32f r32i r32ui r8 r8_snorm r8i r8ui readonly restrict '
        + 'rg16 rg16_snorm rg16f rg16i rg16ui rg32f rg32i rg32ui rg8 rg8_snorm rg8i rg8ui rgb10_a2 '
        + 'rgb10_a2ui rgba16 rgba16_snorm rgba16f rgba16i rgba16ui rgba32f rgba32i rgba32ui rgba8 '
        + 'rgba8_snorm rgba8i rgba8ui row_major sample shared smooth std140 std430 stream triangle_strip '
        + 'triangles triangles_adjacency uniform varying vertices volatile writeonly',
      type:
        'atomic_uint bool bvec2 bvec3 bvec4 dmat2 dmat2x2 dmat2x3 dmat2x4 dmat3 dmat3x2 dmat3x3 '
        + 'dmat3x4 dmat4 dmat4x2 dmat4x3 dmat4x4 double dvec2 dvec3 dvec4 float iimage1D iimage1DArray '
        + 'iimage2D iimage2DArray iimage2DMS iimage2DMSArray iimage2DRect iimage3D iimageBuffer '
        + 'iimageCube iimageCubeArray image1D image1DArray image2D image2DArray image2DMS image2DMSArray '
        + 'image2DRect image3D imageBuffer imageCube imageCubeArray int isampler1D isampler1DArray '
        + 'isampler2D isampler2DArray isampler2DMS isampler2DMSArray isampler2DRect isampler3D '
        + 'isamplerBuffer isamplerCube isamplerCubeArray ivec2 ivec3 ivec4 mat2 mat2x2 mat2x3 '
        + 'mat2x4 mat3 mat3x2 mat3x3 mat3x4 mat4 mat4x2 mat4x3 mat4x4 sampler1D sampler1DArray '
        + 'sampler1DArrayShadow sampler1DShadow sampler2D sampler2DArray sampler2DArrayShadow '
        + 'sampler2DMS sampler2DMSArray sampler2DRect sampler2DRectShadow sampler2DShadow sampler3D '
        + 'samplerBuffer samplerCube samplerCubeArray samplerCubeArrayShadow samplerCubeShadow '
        + 'image1D uimage1DArray uimage2D uimage2DArray uimage2DMS uimage2DMSArray uimage2DRect '
        + 'uimage3D uimageBuffer uimageCube uimageCubeArray uint usampler1D usampler1DArray '
        + 'usampler2D usampler2DArray usampler2DMS usampler2DMSArray usampler2DRect usampler3D '
        + 'samplerBuffer usamplerCube usamplerCubeArray uvec2 uvec3 uvec4 vec2 vec3 vec4 void',
      built_in:
        // Constants
        'gl_MaxAtomicCounterBindings gl_MaxAtomicCounterBufferSize gl_MaxClipDistances gl_MaxClipPlanes '
        + 'gl_MaxCombinedAtomicCounterBuffers gl_MaxCombinedAtomicCounters gl_MaxCombinedImageUniforms '
        + 'gl_MaxCombinedImageUnitsAndFragmentOutputs gl_MaxCombinedTextureImageUnits gl_MaxComputeAtomicCounterBuffers '
        + 'gl_MaxComputeAtomicCounters gl_MaxComputeImageUniforms gl_MaxComputeTextureImageUnits '
        + 'gl_MaxComputeUniformComponents gl_MaxComputeWorkGroupCount gl_MaxComputeWorkGroupSize '
        + 'gl_MaxDrawBuffers gl_MaxFragmentAtomicCounterBuffers gl_MaxFragmentAtomicCounters '
        + 'gl_MaxFragmentImageUniforms gl_MaxFragmentInputComponents gl_MaxFragmentInputVectors '
        + 'gl_MaxFragmentUniformComponents gl_MaxFragmentUniformVectors gl_MaxGeometryAtomicCounterBuffers '
        + 'gl_MaxGeometryAtomicCounters gl_MaxGeometryImageUniforms gl_MaxGeometryInputComponents '
        + 'gl_MaxGeometryOutputComponents gl_MaxGeometryOutputVertices gl_MaxGeometryTextureImageUnits '
        + 'gl_MaxGeometryTotalOutputComponents gl_MaxGeometryUniformComponents gl_MaxGeometryVaryingComponents '
        + 'gl_MaxImageSamples gl_MaxImageUnits gl_MaxLights gl_MaxPatchVertices gl_MaxProgramTexelOffset '
        + 'gl_MaxTessControlAtomicCounterBuffers gl_MaxTessControlAtomicCounters gl_MaxTessControlImageUniforms '
        + 'gl_MaxTessControlInputComponents gl_MaxTessControlOutputComponents gl_MaxTessControlTextureImageUnits '
        + 'gl_MaxTessControlTotalOutputComponents gl_MaxTessControlUniformComponents '
        + 'gl_MaxTessEvaluationAtomicCounterBuffers gl_MaxTessEvaluationAtomicCounters '
        + 'gl_MaxTessEvaluationImageUniforms gl_MaxTessEvaluationInputComponents gl_MaxTessEvaluationOutputComponents '
        + 'gl_MaxTessEvaluationTextureImageUnits gl_MaxTessEvaluationUniformComponents '
        + 'gl_MaxTessGenLevel gl_MaxTessPatchComponents gl_MaxTextureCoords gl_MaxTextureImageUnits '
        + 'gl_MaxTextureUnits gl_MaxVaryingComponents gl_MaxVaryingFloats gl_MaxVaryingVectors '
        + 'gl_MaxVertexAtomicCounterBuffers gl_MaxVertexAtomicCounters gl_MaxVertexAttribs gl_MaxVertexImageUniforms '
        + 'gl_MaxVertexOutputComponents gl_MaxVertexOutputVectors gl_MaxVertexTextureImageUnits '
        + 'gl_MaxVertexUniformComponents gl_MaxVertexUniformVectors gl_MaxViewports gl_MinProgramTexelOffset '
        // Variables
        + 'gl_BackColor gl_BackLightModelProduct gl_BackLightProduct gl_BackMaterial '
        + 'gl_BackSecondaryColor gl_ClipDistance gl_ClipPlane gl_ClipVertex gl_Color '
        + 'gl_DepthRange gl_EyePlaneQ gl_EyePlaneR gl_EyePlaneS gl_EyePlaneT gl_Fog gl_FogCoord '
        + 'gl_FogFragCoord gl_FragColor gl_FragCoord gl_FragData gl_FragDepth gl_FrontColor '
        + 'gl_FrontFacing gl_FrontLightModelProduct gl_FrontLightProduct gl_FrontMaterial '
        + 'gl_FrontSecondaryColor gl_GlobalInvocationID gl_InstanceID gl_InvocationID gl_Layer gl_LightModel '
        + 'gl_LightSource gl_LocalInvocationID gl_LocalInvocationIndex gl_ModelViewMatrix '
        + 'gl_ModelViewMatrixInverse gl_ModelViewMatrixInverseTranspose gl_ModelViewMatrixTranspose '
        + 'gl_ModelViewProjectionMatrix gl_ModelViewProjectionMatrixInverse gl_ModelViewProjectionMatrixInverseTranspose '
        + 'gl_ModelViewProjectionMatrixTranspose gl_MultiTexCoord0 gl_MultiTexCoord1 gl_MultiTexCoord2 '
        + 'gl_MultiTexCoord3 gl_MultiTexCoord4 gl_MultiTexCoord5 gl_MultiTexCoord6 gl_MultiTexCoord7 '
        + 'gl_Normal gl_NormalMatrix gl_NormalScale gl_NumSamples gl_NumWorkGroups gl_ObjectPlaneQ '
        + 'gl_ObjectPlaneR gl_ObjectPlaneS gl_ObjectPlaneT gl_PatchVerticesIn gl_Point gl_PointCoord '
        + 'gl_PointSize gl_Position gl_PrimitiveID gl_PrimitiveIDIn gl_ProjectionMatrix gl_ProjectionMatrixInverse '
        + 'gl_ProjectionMatrixInverseTranspose gl_ProjectionMatrixTranspose gl_SampleID gl_SampleMask '
        + 'gl_SampleMaskIn gl_SamplePosition gl_SecondaryColor gl_TessCoord gl_TessLevelInner gl_TessLevelOuter '
        + 'gl_TexCoord gl_TextureEnvColor gl_TextureMatrix gl_TextureMatrixInverse gl_TextureMatrixInverseTranspose '
        + 'gl_TextureMatrixTranspose gl_Vertex gl_VertexID gl_ViewportIndex gl_WorkGroupID gl_WorkGroupSize gl_in gl_out '
        // Functions
        + 'EmitStreamVertex EmitVertex EndPrimitive EndStreamPrimitive abs acos acosh all any asin '
        + 'asinh atan atanh atomicAdd atomicAnd atomicCompSwap atomicCounter atomicCounterDecrement '
        + 'atomicCounterIncrement atomicExchange atomicMax atomicMin atomicOr atomicXor barrier '
        + 'bitCount bitfieldExtract bitfieldInsert bitfieldReverse ceil clamp cos cosh cross '
        + 'dFdx dFdy degrees determinant distance dot equal exp exp2 faceforward findLSB findMSB '
        + 'floatBitsToInt floatBitsToUint floor fma fract frexp ftransform fwidth greaterThan '
        + 'greaterThanEqual groupMemoryBarrier imageAtomicAdd imageAtomicAnd imageAtomicCompSwap '
        + 'imageAtomicExchange imageAtomicMax imageAtomicMin imageAtomicOr imageAtomicXor imageLoad '
        + 'imageSize imageStore imulExtended intBitsToFloat interpolateAtCentroid interpolateAtOffset '
        + 'interpolateAtSample inverse inversesqrt isinf isnan ldexp length lessThan lessThanEqual log '
        + 'log2 matrixCompMult max memoryBarrier memoryBarrierAtomicCounter memoryBarrierBuffer '
        + 'memoryBarrierImage memoryBarrierShared min mix mod modf noise1 noise2 noise3 noise4 '
        + 'normalize not notEqual outerProduct packDouble2x32 packHalf2x16 packSnorm2x16 packSnorm4x8 '
        + 'packUnorm2x16 packUnorm4x8 pow radians reflect refract round roundEven shadow1D shadow1DLod '
        + 'shadow1DProj shadow1DProjLod shadow2D shadow2DLod shadow2DProj shadow2DProjLod sign sin sinh '
        + 'smoothstep sqrt step tan tanh texelFetch texelFetchOffset texture texture1D texture1DLod '
        + 'texture1DProj texture1DProjLod texture2D texture2DLod texture2DProj texture2DProjLod '
        + 'texture3D texture3DLod texture3DProj texture3DProjLod textureCube textureCubeLod '
        + 'textureGather textureGatherOffset textureGatherOffsets textureGrad textureGradOffset '
        + 'textureLod textureLodOffset textureOffset textureProj textureProjGrad textureProjGradOffset '
        + 'textureProjLod textureProjLodOffset textureProjOffset textureQueryLevels textureQueryLod '
        + 'textureSize transpose trunc uaddCarry uintBitsToFloat umulExtended unpackDouble2x32 '
        + 'unpackHalf2x16 unpackSnorm2x16 unpackSnorm4x8 unpackUnorm2x16 unpackUnorm4x8 usubBorrow',
      literal: 'true false'
    },
    illegal: '"',
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.C_NUMBER_MODE,
      {
        className: 'meta',
        begin: '#',
        end: '$'
      }
    ]
  };
}

export { glsl as default };
