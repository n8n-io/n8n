import {
  OnChangeFn,
  Table,
  Row,
  RowModel,
  Updater,
  RowData,
  TableFeature,
} from '../types'
import { getMemoOptions, makeStateUpdater, memo } from '../utils'

export type RowSelectionState = Record<string, boolean>

export interface RowSelectionTableState {
  rowSelection: RowSelectionState
}

export interface RowSelectionOptions<TData extends RowData> {
  /**
   * - Enables/disables multiple row selection for all rows in the table OR
   * - A function that given a row, returns whether to enable/disable multiple row selection for that row's children/grandchildren
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#enablemultirowselection)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  enableMultiRowSelection?: boolean | ((row: Row<TData>) => boolean)
  /**
   * - Enables/disables row selection for all rows in the table OR
   * - A function that given a row, returns whether to enable/disable row selection for that row
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#enablerowselection)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean)
  /**
   * Enables/disables automatic sub-row selection when a parent row is selected, or a function that enables/disables automatic sub-row selection for each row.
   * (Use in combination with expanding or grouping features)
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#enablesubrowselection)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  enableSubRowSelection?: boolean | ((row: Row<TData>) => boolean)
  /**
   * If provided, this function will be called with an `updaterFn` when `state.rowSelection` changes. This overrides the default internal state management, so you will need to persist the state change either fully or partially outside of the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#onrowselectionchange)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  // enableGroupingRowSelection?:
  //   | boolean
  //   | ((
  //       row: Row<TData>
  //     ) => boolean)
  // isAdditiveSelectEvent?: (e: unknown) => boolean
  // isInclusiveSelectEvent?: (e: unknown) => boolean
  // selectRowsFn?: (
  //   table: Table<TData>,
  //   rowModel: RowModel<TData>
  // ) => RowModel<TData>
}

export interface RowSelectionRow {
  /**
   * Returns whether or not the row can multi-select.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getcanmultiselect)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getCanMultiSelect: () => boolean
  /**
   * Returns whether or not the row can be selected.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getcanselect)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getCanSelect: () => boolean
  /**
   * Returns whether or not the row can select sub rows automatically when the parent row is selected.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getcanselectsubrows)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getCanSelectSubRows: () => boolean
  /**
   * Returns whether or not all of the row's sub rows are selected.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getisallsubrowsselected)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getIsAllSubRowsSelected: () => boolean
  /**
   * Returns whether or not the row is selected.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getisselected)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getIsSelected: () => boolean
  /**
   * Returns whether or not some of the row's sub rows are selected.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getissomeselected)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getIsSomeSelected: () => boolean
  /**
   * Returns a handler that can be used to toggle the row.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#gettoggleselectedhandler)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getToggleSelectedHandler: () => (event: unknown) => void
  /**
   * Selects/deselects the row.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#toggleselected)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  toggleSelected: (value?: boolean, opts?: { selectChildren?: boolean }) => void
}

export interface RowSelectionInstance<TData extends RowData> {
  /**
   * Returns the row model of all rows that are selected after filtering has been applied.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getfilteredselectedrowmodel)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getFilteredSelectedRowModel: () => RowModel<TData>
  /**
   * Returns the row model of all rows that are selected after grouping has been applied.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getgroupedselectedrowmodel)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getGroupedSelectedRowModel: () => RowModel<TData>
  /**
   * Returns whether or not all rows on the current page are selected.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getisallpagerowsselected)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getIsAllPageRowsSelected: () => boolean
  /**
   * Returns whether or not all rows in the table are selected.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getisallrowsselected)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getIsAllRowsSelected: () => boolean
  /**
   * Returns whether or not any rows on the current page are selected.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getissomepagerowsselected)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getIsSomePageRowsSelected: () => boolean
  /**
   * Returns whether or not any rows in the table are selected.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getissomerowsselected)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getIsSomeRowsSelected: () => boolean
  /**
   * Returns the core row model of all rows before row selection has been applied.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getpreselectedrowmodel)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getPreSelectedRowModel: () => RowModel<TData>
  /**
   * Returns the row model of all rows that are selected.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getselectedrowmodel)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getSelectedRowModel: () => RowModel<TData>
  /**
   * Returns a handler that can be used to toggle all rows on the current page.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#gettoggleallpagerowsselectedhandler)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getToggleAllPageRowsSelectedHandler: () => (event: unknown) => void
  /**
   * Returns a handler that can be used to toggle all rows in the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#gettoggleallrowsselectedhandler)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  getToggleAllRowsSelectedHandler: () => (event: unknown) => void
  /**
   * Resets the **rowSelection** state to the `initialState.rowSelection`, or `true` can be passed to force a default blank state reset to `{}`.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#resetrowselection)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  resetRowSelection: (defaultState?: boolean) => void
  /**
   * Sets or updates the `state.rowSelection` state.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#setrowselection)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  setRowSelection: (updater: Updater<RowSelectionState>) => void
  /**
   * Selects/deselects all rows on the current page.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#toggleallpagerowsselected)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  toggleAllPageRowsSelected: (value?: boolean) => void
  /**
   * Selects/deselects all rows in the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#toggleallrowsselected)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
   */
  toggleAllRowsSelected: (value?: boolean) => void
}

//

export const RowSelection: TableFeature = {
  getInitialState: (state): RowSelectionTableState => {
    return {
      rowSelection: {},
      ...state,
    }
  },

  getDefaultOptions: <TData extends RowData>(
    table: Table<TData>
  ): RowSelectionOptions<TData> => {
    return {
      onRowSelectionChange: makeStateUpdater('rowSelection', table),
      enableRowSelection: true,
      enableMultiRowSelection: true,
      enableSubRowSelection: true,
      // enableGroupingRowSelection: false,
      // isAdditiveSelectEvent: (e: unknown) => !!e.metaKey,
      // isInclusiveSelectEvent: (e: unknown) => !!e.shiftKey,
    }
  },

  createTable: <TData extends RowData>(table: Table<TData>): void => {
    table.setRowSelection = updater =>
      table.options.onRowSelectionChange?.(updater)
    table.resetRowSelection = defaultState =>
      table.setRowSelection(
        defaultState ? {} : table.initialState.rowSelection ?? {}
      )
    table.toggleAllRowsSelected = value => {
      table.setRowSelection(old => {
        value =
          typeof value !== 'undefined' ? value : !table.getIsAllRowsSelected()

        const rowSelection = { ...old }

        const preGroupedFlatRows = table.getPreGroupedRowModel().flatRows

        // We don't use `mutateRowIsSelected` here for performance reasons.
        // All of the rows are flat already, so it wouldn't be worth it
        if (value) {
          preGroupedFlatRows.forEach(row => {
            if (!row.getCanSelect()) {
              return
            }
            rowSelection[row.id] = true
          })
        } else {
          preGroupedFlatRows.forEach(row => {
            delete rowSelection[row.id]
          })
        }

        return rowSelection
      })
    }
    table.toggleAllPageRowsSelected = value =>
      table.setRowSelection(old => {
        const resolvedValue =
          typeof value !== 'undefined'
            ? value
            : !table.getIsAllPageRowsSelected()

        const rowSelection: RowSelectionState = { ...old }

        table.getRowModel().rows.forEach(row => {
          mutateRowIsSelected(rowSelection, row.id, resolvedValue, true, table)
        })

        return rowSelection
      })

    // addRowSelectionRange: rowId => {
    //   const {
    //     rows,
    //     rowsById,
    //     options: { selectGroupingRows, selectSubRows },
    //   } = table

    //   const findSelectedRow = (rows: Row[]) => {
    //     let found
    //     rows.find(d => {
    //       if (d.getIsSelected()) {
    //         found = d
    //         return true
    //       }
    //       const subFound = findSelectedRow(d.subRows || [])
    //       if (subFound) {
    //         found = subFound
    //         return true
    //       }
    //       return false
    //     })
    //     return found
    //   }

    //   const firstRow = findSelectedRow(rows) || rows[0]
    //   const lastRow = rowsById[rowId]

    //   let include = false
    //   const selectedRowIds = {}

    //   const addRow = (row: Row) => {
    //     mutateRowIsSelected(selectedRowIds, row.id, true, {
    //       rowsById,
    //       selectGroupingRows: selectGroupingRows!,
    //       selectSubRows: selectSubRows!,
    //     })
    //   }

    //   table.rows.forEach(row => {
    //     const isFirstRow = row.id === firstRow.id
    //     const isLastRow = row.id === lastRow.id

    //     if (isFirstRow || isLastRow) {
    //       if (!include) {
    //         include = true
    //       } else if (include) {
    //         addRow(row)
    //         include = false
    //       }
    //     }

    //     if (include) {
    //       addRow(row)
    //     }
    //   })

    //   table.setRowSelection(selectedRowIds)
    // },
    table.getPreSelectedRowModel = () => table.getCoreRowModel()
    table.getSelectedRowModel = memo(
      () => [table.getState().rowSelection, table.getCoreRowModel()],
      (rowSelection, rowModel) => {
        if (!Object.keys(rowSelection).length) {
          return {
            rows: [],
            flatRows: [],
            rowsById: {},
          }
        }

        return selectRowsFn(table, rowModel)
      },
      getMemoOptions(table.options, 'debugTable', 'getSelectedRowModel')
    )

    table.getFilteredSelectedRowModel = memo(
      () => [table.getState().rowSelection, table.getFilteredRowModel()],
      (rowSelection, rowModel) => {
        if (!Object.keys(rowSelection).length) {
          return {
            rows: [],
            flatRows: [],
            rowsById: {},
          }
        }

        return selectRowsFn(table, rowModel)
      },
      getMemoOptions(table.options, 'debugTable', 'getFilteredSelectedRowModel')
    )

    table.getGroupedSelectedRowModel = memo(
      () => [table.getState().rowSelection, table.getSortedRowModel()],
      (rowSelection, rowModel) => {
        if (!Object.keys(rowSelection).length) {
          return {
            rows: [],
            flatRows: [],
            rowsById: {},
          }
        }

        return selectRowsFn(table, rowModel)
      },
      getMemoOptions(table.options, 'debugTable', 'getGroupedSelectedRowModel')
    )

    ///

    // getGroupingRowCanSelect: rowId => {
    //   const row = table.getRow(rowId)

    //   if (!row) {
    //     throw new Error()
    //   }

    //   if (typeof table.options.enableGroupingRowSelection === 'function') {
    //     return table.options.enableGroupingRowSelection(row)
    //   }

    //   return table.options.enableGroupingRowSelection ?? false
    // },

    table.getIsAllRowsSelected = () => {
      const preGroupedFlatRows = table.getFilteredRowModel().flatRows
      const { rowSelection } = table.getState()

      let isAllRowsSelected = Boolean(
        preGroupedFlatRows.length && Object.keys(rowSelection).length
      )

      if (isAllRowsSelected) {
        if (
          preGroupedFlatRows.some(
            row => row.getCanSelect() && !rowSelection[row.id]
          )
        ) {
          isAllRowsSelected = false
        }
      }

      return isAllRowsSelected
    }

    table.getIsAllPageRowsSelected = () => {
      const paginationFlatRows = table
        .getPaginationRowModel()
        .flatRows.filter(row => row.getCanSelect())
      const { rowSelection } = table.getState()

      let isAllPageRowsSelected = !!paginationFlatRows.length

      if (
        isAllPageRowsSelected &&
        paginationFlatRows.some(row => !rowSelection[row.id])
      ) {
        isAllPageRowsSelected = false
      }

      return isAllPageRowsSelected
    }

    table.getIsSomeRowsSelected = () => {
      const totalSelected = Object.keys(
        table.getState().rowSelection ?? {}
      ).length
      return (
        totalSelected > 0 &&
        totalSelected < table.getFilteredRowModel().flatRows.length
      )
    }

    table.getIsSomePageRowsSelected = () => {
      const paginationFlatRows = table.getPaginationRowModel().flatRows
      return table.getIsAllPageRowsSelected()
        ? false
        : paginationFlatRows
            .filter(row => row.getCanSelect())
            .some(d => d.getIsSelected() || d.getIsSomeSelected())
    }

    table.getToggleAllRowsSelectedHandler = () => {
      return (e: unknown) => {
        table.toggleAllRowsSelected(
          ((e as MouseEvent).target as HTMLInputElement).checked
        )
      }
    }

    table.getToggleAllPageRowsSelectedHandler = () => {
      return (e: unknown) => {
        table.toggleAllPageRowsSelected(
          ((e as MouseEvent).target as HTMLInputElement).checked
        )
      }
    }
  },

  createRow: <TData extends RowData>(
    row: Row<TData>,
    table: Table<TData>
  ): void => {
    row.toggleSelected = (value, opts) => {
      const isSelected = row.getIsSelected()

      table.setRowSelection(old => {
        value = typeof value !== 'undefined' ? value : !isSelected

        if (row.getCanSelect() && isSelected === value) {
          return old
        }

        const selectedRowIds = { ...old }

        mutateRowIsSelected(
          selectedRowIds,
          row.id,
          value,
          opts?.selectChildren ?? true,
          table
        )

        return selectedRowIds
      })
    }
    row.getIsSelected = () => {
      const { rowSelection } = table.getState()
      return isRowSelected(row, rowSelection)
    }

    row.getIsSomeSelected = () => {
      const { rowSelection } = table.getState()
      return isSubRowSelected(row, rowSelection, table) === 'some'
    }

    row.getIsAllSubRowsSelected = () => {
      const { rowSelection } = table.getState()
      return isSubRowSelected(row, rowSelection, table) === 'all'
    }

    row.getCanSelect = () => {
      if (typeof table.options.enableRowSelection === 'function') {
        return table.options.enableRowSelection(row)
      }

      return table.options.enableRowSelection ?? true
    }

    row.getCanSelectSubRows = () => {
      if (typeof table.options.enableSubRowSelection === 'function') {
        return table.options.enableSubRowSelection(row)
      }

      return table.options.enableSubRowSelection ?? true
    }

    row.getCanMultiSelect = () => {
      if (typeof table.options.enableMultiRowSelection === 'function') {
        return table.options.enableMultiRowSelection(row)
      }

      return table.options.enableMultiRowSelection ?? true
    }
    row.getToggleSelectedHandler = () => {
      const canSelect = row.getCanSelect()

      return (e: unknown) => {
        if (!canSelect) return
        row.toggleSelected(
          ((e as MouseEvent).target as HTMLInputElement)?.checked
        )
      }
    }
  },
}

const mutateRowIsSelected = <TData extends RowData>(
  selectedRowIds: Record<string, boolean>,
  id: string,
  value: boolean,
  includeChildren: boolean,
  table: Table<TData>
) => {
  const row = table.getRow(id, true)

  // const isGrouped = row.getIsGrouped()

  // if ( // TODO: enforce grouping row selection rules
  //   !isGrouped ||
  //   (isGrouped && table.options.enableGroupingRowSelection)
  // ) {
  if (value) {
    if (!row.getCanMultiSelect()) {
      Object.keys(selectedRowIds).forEach(key => delete selectedRowIds[key])
    }
    if (row.getCanSelect()) {
      selectedRowIds[id] = true
    }
  } else {
    delete selectedRowIds[id]
  }
  // }

  if (includeChildren && row.subRows?.length && row.getCanSelectSubRows()) {
    row.subRows.forEach(row =>
      mutateRowIsSelected(selectedRowIds, row.id, value, includeChildren, table)
    )
  }
}

export function selectRowsFn<TData extends RowData>(
  table: Table<TData>,
  rowModel: RowModel<TData>
): RowModel<TData> {
  const rowSelection = table.getState().rowSelection

  const newSelectedFlatRows: Row<TData>[] = []
  const newSelectedRowsById: Record<string, Row<TData>> = {}

  // Filters top level and nested rows
  const recurseRows = (rows: Row<TData>[], depth = 0): Row<TData>[] => {
    return rows
      .map(row => {
        const isSelected = isRowSelected(row, rowSelection)

        if (isSelected) {
          newSelectedFlatRows.push(row)
          newSelectedRowsById[row.id] = row
        }

        if (row.subRows?.length) {
          row = {
            ...row,
            subRows: recurseRows(row.subRows, depth + 1),
          }
        }

        if (isSelected) {
          return row
        }
      })
      .filter(Boolean) as Row<TData>[]
  }

  return {
    rows: recurseRows(rowModel.rows),
    flatRows: newSelectedFlatRows,
    rowsById: newSelectedRowsById,
  }
}

export function isRowSelected<TData extends RowData>(
  row: Row<TData>,
  selection: Record<string, boolean>
): boolean {
  return selection[row.id] ?? false
}

export function isSubRowSelected<TData extends RowData>(
  row: Row<TData>,
  selection: Record<string, boolean>,
  table: Table<TData>
): boolean | 'some' | 'all' {
  if (!row.subRows?.length) return false

  let allChildrenSelected = true
  let someSelected = false

  row.subRows.forEach(subRow => {
    // Bail out early if we know both of these
    if (someSelected && !allChildrenSelected) {
      return
    }

    if (subRow.getCanSelect()) {
      if (isRowSelected(subRow, selection)) {
        someSelected = true
      } else {
        allChildrenSelected = false
      }
    }

    // Check row selection of nested subrows
    if (subRow.subRows && subRow.subRows.length) {
      const subRowChildrenSelected = isSubRowSelected(subRow, selection, table)
      if (subRowChildrenSelected === 'all') {
        someSelected = true
      } else if (subRowChildrenSelected === 'some') {
        someSelected = true
        allChildrenSelected = false
      } else {
        allChildrenSelected = false
      }
    }
  })

  return allChildrenSelected ? 'all' : someSelected ? 'some' : false
}
