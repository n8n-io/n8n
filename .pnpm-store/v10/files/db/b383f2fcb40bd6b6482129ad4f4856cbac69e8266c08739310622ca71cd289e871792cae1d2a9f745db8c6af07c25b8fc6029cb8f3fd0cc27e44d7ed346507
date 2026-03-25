const React = require('react');

function MetricCells({ metrics }) {
    const { classForPercent, pct, covered, missed, total } = metrics;

    return (
        <>
            <td className={'pct ' + classForPercent}>{Math.round(pct)}% </td>
            <td className={classForPercent}>
                <div className="bar">
                    <div
                        className={`bar__data ${classForPercent} ${classForPercent}--dark`}
                        style={{ width: pct + '%' }}
                    ></div>
                </div>
            </td>
            <td className={'abs ' + classForPercent}>{covered}</td>
            <td className={'abs ' + classForPercent}>{missed}</td>
            <td className={'abs ' + classForPercent}>{total}</td>
        </>
    );
}

function FileCell({
    file,
    prefix,
    expandedLines,
    setExpandedLines,
    hasChildren,
    setFileFilter
}) {
    if (hasChildren) {
        const expandedIndex = expandedLines.indexOf(prefix + file);
        const isExpanded = expandedIndex >= 0;
        const newExpandedLines = isExpanded
            ? [
                  ...expandedLines.slice(0, expandedIndex),
                  ...expandedLines.slice(expandedIndex + 1)
              ]
            : [...expandedLines, prefix + file];

        return (
            <>
                <button
                    type="button"
                    onClick={() => setExpandedLines(newExpandedLines)}
                    className="expandbutton"
                >
                    {isExpanded ? String.fromCharCode(0x2013) : '+'}
                </button>
                <a
                    href="javascript:void(0)"
                    onClick={() => setFileFilter(prefix + file)}
                >
                    {file}
                </a>
            </>
        );
    } else {
        return <a href={`./${prefix}${file}.html`}>{file}</a>;
    }
}

function getWorstMetricClassForPercent(metricsToShow, metrics) {
    let classForPercent = 'none';
    for (const metricToShow in metricsToShow) {
        if (metricsToShow[metricToShow]) {
            const metricClassForPercent = metrics[metricToShow].classForPercent;

            // ignore none metrics so they don't change whats shown
            if (metricClassForPercent === 'none') {
                continue;
            }

            // if the metric low or lower than whats currently being used, replace it
            if (
                metricClassForPercent == 'low' ||
                (metricClassForPercent === 'medium' &&
                    classForPercent !== 'low') ||
                (metricClassForPercent === 'high' &&
                    classForPercent !== 'low' &&
                    classForPercent !== 'medium')
            ) {
                classForPercent = metricClassForPercent;
            }
        }
    }
    return classForPercent;
}

module.exports = function SummaryTableLine({
    prefix,
    metrics,
    file,
    children,
    tabSize,
    metricsToShow,
    expandedLines,
    setExpandedLines,
    fileFilter,
    setFileFilter
}) {
    tabSize = tabSize || 0;
    if (children && tabSize > 0) {
        tabSize--;
    }
    prefix = (fileFilter ? fileFilter + '/' : '') + (prefix || '');

    return (
        <>
            <tr>
                <td
                    className={
                        'file ' +
                        getWorstMetricClassForPercent(metricsToShow, metrics)
                    }
                >
                    {/* eslint-disable-line prefer-spread */ Array.apply(null, {
                        length: tabSize
                    }).map((nothing, index) => (
                        <span className="filetab" key={index} />
                    ))}
                    <FileCell
                        file={file}
                        prefix={prefix}
                        expandedLines={expandedLines}
                        setExpandedLines={setExpandedLines}
                        hasChildren={Boolean(children)}
                        setFileFilter={setFileFilter}
                    />
                </td>
                {metricsToShow.statements && (
                    <MetricCells metrics={metrics.statements} />
                )}
                {metricsToShow.branches && (
                    <MetricCells metrics={metrics.branches} />
                )}
                {metricsToShow.functions && (
                    <MetricCells metrics={metrics.functions} />
                )}
                {metricsToShow.lines && <MetricCells metrics={metrics.lines} />}
            </tr>
            {children &&
                expandedLines.indexOf(prefix + file) >= 0 &&
                children.map(child => (
                    <SummaryTableLine
                        {...child}
                        tabSize={tabSize + 2}
                        key={child.file}
                        prefix={prefix + file + '/'}
                        metricsToShow={metricsToShow}
                        expandedLines={expandedLines}
                        setExpandedLines={setExpandedLines}
                        setFileFilter={setFileFilter}
                    />
                ))}
        </>
    );
};
