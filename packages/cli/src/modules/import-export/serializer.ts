export interface Serializer<TEntity, TSerialized> {
	serialize(entity: TEntity): TSerialized;
}
