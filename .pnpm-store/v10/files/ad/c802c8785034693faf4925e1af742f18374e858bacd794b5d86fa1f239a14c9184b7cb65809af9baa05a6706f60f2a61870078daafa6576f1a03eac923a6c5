import {
  RowData,
  Column,
  Header,
  HeaderGroup,
  Table,
  TableFeature,
} from '../types'
import { getMemoOptions, memo } from '../utils'

const debug = 'debugHeaders'

export interface CoreHeaderGroup<TData extends RowData> {
  depth: number
  headers: Header<TData, unknown>[]
  id: string
}

export interface HeaderContext<TData, TValue> {
  /**
   * An instance of a column.
   */
  column: Column<TData, TValue>
  /**
   * An instance of a header.
   */
  header: Header<TData, TValue>
  /**
   * The table instance.
   */
  table: Table<TData>
}

export interface CoreHeader<TData extends RowData, TValue> {
  /**
   * The col-span for the header.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#colspan)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  colSpan: number
  /**
   * The header's associated column object.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#column)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  column: Column<TData, TValue>
  /**
   * The depth of the header, zero-indexed based.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#depth)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  depth: number
  /**
   * Returns the rendering context (or props) for column-based components like headers, footers and filters.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#getcontext)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getContext: () => HeaderContext<TData, TValue>
  /**
   * Returns the leaf headers hierarchically nested under this header.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#getleafheaders)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getLeafHeaders: () => Header<TData, unknown>[]
  /**
   * The header's associated header group object.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#headergroup)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  headerGroup: HeaderGroup<TData>
  /**
   * The unique identifier for the header.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#id)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  id: string
  /**
   * The index for the header within the header group.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#index)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  index: number
  /**
   * A boolean denoting if the header is a placeholder header.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#isplaceholder)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  isPlaceholder: boolean
  /**
   * If the header is a placeholder header, this will be a unique header ID that does not conflict with any other headers across the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#placeholderid)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  placeholderId?: string
  /**
   * The row-span for the header.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#rowspan)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  rowSpan: number
  /**
   * The header's hierarchical sub/child headers. Will be empty if the header's associated column is a leaf-column.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#subheaders)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  subHeaders: Header<TData, TValue>[]
}

export interface HeadersInstance<TData extends RowData> {
  /**
   * Returns all header groups for the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getheadergroups)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getHeaderGroups: () => HeaderGroup<TData>[]
  /**
   * If pinning, returns the header groups for the left pinned columns.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getleftheadergroups)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getLeftHeaderGroups: () => HeaderGroup<TData>[]
  /**
   * If pinning, returns the header groups for columns that are not pinned.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getcenterheadergroups)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getCenterHeaderGroups: () => HeaderGroup<TData>[]
  /**
   * If pinning, returns the header groups for the right pinned columns.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getrightheadergroups)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getRightHeaderGroups: () => HeaderGroup<TData>[]

  /**
   * Returns the footer groups for the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getfootergroups)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getFooterGroups: () => HeaderGroup<TData>[]
  /**
   * If pinning, returns the footer groups for the left pinned columns.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getleftfootergroups)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getLeftFooterGroups: () => HeaderGroup<TData>[]
  /**
   * If pinning, returns the footer groups for columns that are not pinned.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getcenterfootergroups)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getCenterFooterGroups: () => HeaderGroup<TData>[]
  /**
   * If pinning, returns the footer groups for the right pinned columns.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getrightfootergroups)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getRightFooterGroups: () => HeaderGroup<TData>[]

  /**
   * Returns headers for all columns in the table, including parent headers.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getflatheaders)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getFlatHeaders: () => Header<TData, unknown>[]
  /**
   * If pinning, returns headers for all left pinned columns in the table, including parent headers.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getleftflatheaders)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getLeftFlatHeaders: () => Header<TData, unknown>[]
  /**
   * If pinning, returns headers for all columns that are not pinned, including parent headers.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getcenterflatheaders)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getCenterFlatHeaders: () => Header<TData, unknown>[]
  /**
   * If pinning, returns headers for all right pinned columns in the table, including parent headers.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getrightflatheaders)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getRightFlatHeaders: () => Header<TData, unknown>[]

  /**
   * Returns headers for all leaf columns in the table, (not including parent headers).
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getleafheaders)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getLeafHeaders: () => Header<TData, unknown>[]
  /**
   * If pinning, returns headers for all left pinned leaf columns in the table, (not including parent headers).
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getleftleafheaders)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getLeftLeafHeaders: () => Header<TData, unknown>[]
  /**
   * If pinning, returns headers for all columns that are not pinned, (not including parent headers).
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getcenterleafheaders)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getCenterLeafHeaders: () => Header<TData, unknown>[]
  /**
   * If pinning, returns headers for all right pinned leaf columns in the table, (not including parent headers).
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getrightleafheaders)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
   */
  getRightLeafHeaders: () => Header<TData, unknown>[]
}

//

function createHeader<TData extends RowData, TValue>(
  table: Table<TData>,
  column: Column<TData, TValue>,
  options: {
    id?: string
    isPlaceholder?: boolean
    placeholderId?: string
    index: number
    depth: number
  }
): Header<TData, TValue> {
  const id = options.id ?? column.id

  let header: CoreHeader<TData, TValue> = {
    id,
    column,
    index: options.index,
    isPlaceholder: !!options.isPlaceholder,
    placeholderId: options.placeholderId,
    depth: options.depth,
    subHeaders: [],
    colSpan: 0,
    rowSpan: 0,
    headerGroup: null!,
    getLeafHeaders: (): Header<TData, unknown>[] => {
      const leafHeaders: Header<TData, unknown>[] = []

      const recurseHeader = (h: CoreHeader<TData, any>) => {
        if (h.subHeaders && h.subHeaders.length) {
          h.subHeaders.map(recurseHeader)
        }
        leafHeaders.push(h as Header<TData, unknown>)
      }

      recurseHeader(header)

      return leafHeaders
    },
    getContext: () => ({
      table,
      header: header as Header<TData, TValue>,
      column,
    }),
  }

  table._features.forEach(feature => {
    feature.createHeader?.(header as Header<TData, TValue>, table)
  })

  return header as Header<TData, TValue>
}

export const Headers: TableFeature = {
  createTable: <TData extends RowData>(table: Table<TData>): void => {
    // Header Groups

    table.getHeaderGroups = memo(
      () => [
        table.getAllColumns(),
        table.getVisibleLeafColumns(),
        table.getState().columnPinning.left,
        table.getState().columnPinning.right,
      ],
      (allColumns, leafColumns, left, right) => {
        const leftColumns =
          left
            ?.map(columnId => leafColumns.find(d => d.id === columnId)!)
            .filter(Boolean) ?? []

        const rightColumns =
          right
            ?.map(columnId => leafColumns.find(d => d.id === columnId)!)
            .filter(Boolean) ?? []

        const centerColumns = leafColumns.filter(
          column => !left?.includes(column.id) && !right?.includes(column.id)
        )

        const headerGroups = buildHeaderGroups(
          allColumns,
          [...leftColumns, ...centerColumns, ...rightColumns],
          table
        )

        return headerGroups
      },
      getMemoOptions(table.options, debug, 'getHeaderGroups')
    )

    table.getCenterHeaderGroups = memo(
      () => [
        table.getAllColumns(),
        table.getVisibleLeafColumns(),
        table.getState().columnPinning.left,
        table.getState().columnPinning.right,
      ],
      (allColumns, leafColumns, left, right) => {
        leafColumns = leafColumns.filter(
          column => !left?.includes(column.id) && !right?.includes(column.id)
        )
        return buildHeaderGroups(allColumns, leafColumns, table, 'center')
      },
      getMemoOptions(table.options, debug, 'getCenterHeaderGroups')
    )

    table.getLeftHeaderGroups = memo(
      () => [
        table.getAllColumns(),
        table.getVisibleLeafColumns(),
        table.getState().columnPinning.left,
      ],
      (allColumns, leafColumns, left) => {
        const orderedLeafColumns =
          left
            ?.map(columnId => leafColumns.find(d => d.id === columnId)!)
            .filter(Boolean) ?? []

        return buildHeaderGroups(allColumns, orderedLeafColumns, table, 'left')
      },
      getMemoOptions(table.options, debug, 'getLeftHeaderGroups')
    )

    table.getRightHeaderGroups = memo(
      () => [
        table.getAllColumns(),
        table.getVisibleLeafColumns(),
        table.getState().columnPinning.right,
      ],
      (allColumns, leafColumns, right) => {
        const orderedLeafColumns =
          right
            ?.map(columnId => leafColumns.find(d => d.id === columnId)!)
            .filter(Boolean) ?? []

        return buildHeaderGroups(allColumns, orderedLeafColumns, table, 'right')
      },
      getMemoOptions(table.options, debug, 'getRightHeaderGroups')
    )

    // Footer Groups

    table.getFooterGroups = memo(
      () => [table.getHeaderGroups()],
      headerGroups => {
        return [...headerGroups].reverse()
      },
      getMemoOptions(table.options, debug, 'getFooterGroups')
    )

    table.getLeftFooterGroups = memo(
      () => [table.getLeftHeaderGroups()],
      headerGroups => {
        return [...headerGroups].reverse()
      },
      getMemoOptions(table.options, debug, 'getLeftFooterGroups')
    )

    table.getCenterFooterGroups = memo(
      () => [table.getCenterHeaderGroups()],
      headerGroups => {
        return [...headerGroups].reverse()
      },
      getMemoOptions(table.options, debug, 'getCenterFooterGroups')
    )

    table.getRightFooterGroups = memo(
      () => [table.getRightHeaderGroups()],
      headerGroups => {
        return [...headerGroups].reverse()
      },
      getMemoOptions(table.options, debug, 'getRightFooterGroups')
    )

    // Flat Headers

    table.getFlatHeaders = memo(
      () => [table.getHeaderGroups()],
      headerGroups => {
        return headerGroups
          .map(headerGroup => {
            return headerGroup.headers
          })
          .flat()
      },
      getMemoOptions(table.options, debug, 'getFlatHeaders')
    )

    table.getLeftFlatHeaders = memo(
      () => [table.getLeftHeaderGroups()],
      left => {
        return left
          .map(headerGroup => {
            return headerGroup.headers
          })
          .flat()
      },
      getMemoOptions(table.options, debug, 'getLeftFlatHeaders')
    )

    table.getCenterFlatHeaders = memo(
      () => [table.getCenterHeaderGroups()],
      left => {
        return left
          .map(headerGroup => {
            return headerGroup.headers
          })
          .flat()
      },
      getMemoOptions(table.options, debug, 'getCenterFlatHeaders')
    )

    table.getRightFlatHeaders = memo(
      () => [table.getRightHeaderGroups()],
      left => {
        return left
          .map(headerGroup => {
            return headerGroup.headers
          })
          .flat()
      },
      getMemoOptions(table.options, debug, 'getRightFlatHeaders')
    )

    // Leaf Headers

    table.getCenterLeafHeaders = memo(
      () => [table.getCenterFlatHeaders()],
      flatHeaders => {
        return flatHeaders.filter(header => !header.subHeaders?.length)
      },
      getMemoOptions(table.options, debug, 'getCenterLeafHeaders')
    )

    table.getLeftLeafHeaders = memo(
      () => [table.getLeftFlatHeaders()],
      flatHeaders => {
        return flatHeaders.filter(header => !header.subHeaders?.length)
      },
      getMemoOptions(table.options, debug, 'getLeftLeafHeaders')
    )

    table.getRightLeafHeaders = memo(
      () => [table.getRightFlatHeaders()],
      flatHeaders => {
        return flatHeaders.filter(header => !header.subHeaders?.length)
      },
      getMemoOptions(table.options, debug, 'getRightLeafHeaders')
    )

    table.getLeafHeaders = memo(
      () => [
        table.getLeftHeaderGroups(),
        table.getCenterHeaderGroups(),
        table.getRightHeaderGroups(),
      ],
      (left, center, right) => {
        return [
          ...(left[0]?.headers ?? []),
          ...(center[0]?.headers ?? []),
          ...(right[0]?.headers ?? []),
        ]
          .map(header => {
            return header.getLeafHeaders()
          })
          .flat()
      },
      getMemoOptions(table.options, debug, 'getLeafHeaders')
    )
  },
}

export function buildHeaderGroups<TData extends RowData>(
  allColumns: Column<TData, unknown>[],
  columnsToGroup: Column<TData, unknown>[],
  table: Table<TData>,
  headerFamily?: 'center' | 'left' | 'right'
) {
  // Find the max depth of the columns:
  // build the leaf column row
  // build each buffer row going up
  //    placeholder for non-existent level
  //    real column for existing level

  let maxDepth = 0

  const findMaxDepth = (columns: Column<TData, unknown>[], depth = 1) => {
    maxDepth = Math.max(maxDepth, depth)

    columns
      .filter(column => column.getIsVisible())
      .forEach(column => {
        if (column.columns?.length) {
          findMaxDepth(column.columns, depth + 1)
        }
      }, 0)
  }

  findMaxDepth(allColumns)

  let headerGroups: HeaderGroup<TData>[] = []

  const createHeaderGroup = (
    headersToGroup: Header<TData, unknown>[],
    depth: number
  ) => {
    // The header group we are creating
    const headerGroup: HeaderGroup<TData> = {
      depth,
      id: [headerFamily, `${depth}`].filter(Boolean).join('_'),
      headers: [],
    }

    // The parent columns we're going to scan next
    const pendingParentHeaders: Header<TData, unknown>[] = []

    // Scan each column for parents
    headersToGroup.forEach(headerToGroup => {
      // What is the latest (last) parent column?

      const latestPendingParentHeader = [...pendingParentHeaders].reverse()[0]

      const isLeafHeader = headerToGroup.column.depth === headerGroup.depth

      let column: Column<TData, unknown>
      let isPlaceholder = false

      if (isLeafHeader && headerToGroup.column.parent) {
        // The parent header is new
        column = headerToGroup.column.parent
      } else {
        // The parent header is repeated
        column = headerToGroup.column
        isPlaceholder = true
      }

      if (
        latestPendingParentHeader &&
        latestPendingParentHeader?.column === column
      ) {
        // This column is repeated. Add it as a sub header to the next batch
        latestPendingParentHeader.subHeaders.push(headerToGroup)
      } else {
        // This is a new header. Let's create it
        const header = createHeader(table, column, {
          id: [headerFamily, depth, column.id, headerToGroup?.id]
            .filter(Boolean)
            .join('_'),
          isPlaceholder,
          placeholderId: isPlaceholder
            ? `${pendingParentHeaders.filter(d => d.column === column).length}`
            : undefined,
          depth,
          index: pendingParentHeaders.length,
        })

        // Add the headerToGroup as a subHeader of the new header
        header.subHeaders.push(headerToGroup)
        // Add the new header to the pendingParentHeaders to get grouped
        // in the next batch
        pendingParentHeaders.push(header)
      }

      headerGroup.headers.push(headerToGroup)
      headerToGroup.headerGroup = headerGroup
    })

    headerGroups.push(headerGroup)

    if (depth > 0) {
      createHeaderGroup(pendingParentHeaders, depth - 1)
    }
  }

  const bottomHeaders = columnsToGroup.map((column, index) =>
    createHeader(table, column, {
      depth: maxDepth,
      index,
    })
  )

  createHeaderGroup(bottomHeaders, maxDepth - 1)

  headerGroups.reverse()

  // headerGroups = headerGroups.filter(headerGroup => {
  //   return !headerGroup.headers.every(header => header.isPlaceholder)
  // })

  const recurseHeadersForSpans = (
    headers: Header<TData, unknown>[]
  ): { colSpan: number; rowSpan: number }[] => {
    const filteredHeaders = headers.filter(header =>
      header.column.getIsVisible()
    )

    return filteredHeaders.map(header => {
      let colSpan = 0
      let rowSpan = 0
      let childRowSpans = [0]

      if (header.subHeaders && header.subHeaders.length) {
        childRowSpans = []

        recurseHeadersForSpans(header.subHeaders).forEach(
          ({ colSpan: childColSpan, rowSpan: childRowSpan }) => {
            colSpan += childColSpan
            childRowSpans.push(childRowSpan)
          }
        )
      } else {
        colSpan = 1
      }

      const minChildRowSpan = Math.min(...childRowSpans)
      rowSpan = rowSpan + minChildRowSpan

      header.colSpan = colSpan
      header.rowSpan = rowSpan

      return { colSpan, rowSpan }
    })
  }

  recurseHeadersForSpans(headerGroups[0]?.headers ?? [])

  return headerGroups
}
