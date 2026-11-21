# List Optimization

## Optimized FlatList

```typescript
import { FlatList, ListRenderItem } from 'react-native';
import { memo, useCallback } from 'react';

interface Item {
  id: string;
  title: string;
  subtitle: string;
}

// Memoized list item
const ListItem = memo(function ListItem({
  item,
  onPress
}: {
  item: Item;
  onPress: (id: string) => void;
}) {
  return (
    <Pressable onPress={() => onPress(item.id)} style={styles.item}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </Pressable>
  );
});

function OptimizedList({ data }: { data: Item[] }) {
  // Memoize callbacks
  const handlePress = useCallback((id: string) => {
    console.log('Selected:', id);
  }, []);

  const renderItem: ListRenderItem<Item> = useCallback(
    ({ item }) => <ListItem item={item} onPress={handlePress} />,
    [handlePress]
  );

  const keyExtractor = useCallback((item: Item) => item.id, []);

  // Fixed height for getItemLayout
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      // Performance props
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={5}
      initialNumToRender={10}
      updateCellsBatchingPeriod={50}
    />
  );
}

const ITEM_HEIGHT = 72;
```

## SectionList

```typescript
import { SectionList } from 'react-native';

interface Section {
  title: string;
  data: Item[];
}

function GroupedList({ sections }: { sections: Section[] }) {
  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
    ),
    []
  );

  return (
    <SectionList
      sections={sections}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      keyExtractor={keyExtractor}
      stickySectionHeadersEnabled
    />
  );
}
```

## Pull to Refresh

```typescript
function RefreshableList({ data, onRefresh }: Props) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#007AFF"
        />
      }
    />
  );
}
```

## Infinite Scroll

```typescript
function InfiniteList() {
  const [data, setData] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    const newItems = await fetchMoreItems(data.length);

    if (newItems.length === 0) {
      setHasMore(false);
    } else {
      setData(prev => [...prev, ...newItems]);
    }
    setLoading(false);
  }, [data.length, loading, hasMore]);

  const renderFooter = useCallback(() => {
    if (!loading) return null;
    return <ActivityIndicator style={styles.loader} />;
  }, [loading]);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
    />
  );
}
```

## FlashList (Alternative)

```typescript
import { FlashList } from '@shopify/flash-list';

function FastList({ data }: { data: Item[] }) {
  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      estimatedItemSize={72}
      keyExtractor={keyExtractor}
    />
  );
}
```

## Quick Reference

| Prop | Purpose |
|------|---------|
| `removeClippedSubviews` | Unmount off-screen items |
| `maxToRenderPerBatch` | Items per render batch |
| `windowSize` | Render window multiplier |
| `initialNumToRender` | Initial items to render |
| `getItemLayout` | Skip measurement (fixed height) |

| Optimization | When |
|--------------|------|
| `memo()` | All list items |
| `useCallback` | renderItem, keyExtractor |
| `getItemLayout` | Fixed height items |
| `FlashList` | Very large lists |
