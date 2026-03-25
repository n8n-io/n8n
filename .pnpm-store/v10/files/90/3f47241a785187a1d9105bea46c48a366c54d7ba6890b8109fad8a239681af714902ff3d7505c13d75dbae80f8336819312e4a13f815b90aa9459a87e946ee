export type IsEqualConsideringWritability<OriginalType, WritableType> = (<Type>() => Type extends OriginalType
  ? 1
  : 2) extends <Type>() => Type extends WritableType ? 1 : 2
  ? true
  : false;
