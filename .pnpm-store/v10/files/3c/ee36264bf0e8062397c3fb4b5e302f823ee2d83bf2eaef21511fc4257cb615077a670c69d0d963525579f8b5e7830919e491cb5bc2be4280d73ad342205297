;;; gyp.el - font-lock-mode support for gyp files.

;; Copyright (c) 2012 Google Inc. All rights reserved.
;; Use of this source code is governed by a BSD-style license that can be
;; found in the LICENSE file.

;; Put this somewhere in your load-path and
;; (require 'gyp)

(require 'python)
(require 'cl)

(when (string-match "python-mode.el" (symbol-file 'python-mode 'defun))
  (error (concat "python-mode must be loaded from python.el (bundled with "
                 "recent emacsen), not from the older and less maintained "
                 "python-mode.el")))

(defadvice python-indent-calculate-levels (after gyp-outdent-closing-parens
                                                 activate)
  "De-indent closing parens, braces, and brackets in gyp-mode."
  (when (and (eq major-mode 'gyp-mode)
             (string-match "^ *[])}][],)}]* *$"
                           (buffer-substring-no-properties
                            (line-beginning-position) (line-end-position))))
    (setf (first python-indent-levels)
          (- (first python-indent-levels) python-continuation-offset))))

(defadvice python-indent-guess-indent-offset (around
                                              gyp-indent-guess-indent-offset
                                              activate)
  "Guess correct indent offset in gyp-mode."
  (or (and (not (eq major-mode 'gyp-mode))
           ad-do-it)
      (save-excursion
        (save-restriction
          (widen)
          (goto-char (point-min))
          ;; Find first line ending with an opening brace that is not a comment.
          (or (and (re-search-forward "\\(^[[{]$\\|^.*[^#].*[[{]$\\)")
                   (forward-line)
                   (/= (current-indentation) 0)
                   (set (make-local-variable 'python-indent-offset)
                        (current-indentation))
                   (set (make-local-variable 'python-continuation-offset)
                        (current-indentation)))
              (message "Can't guess gyp indent offset, using default: %s"
                       python-continuation-offset))))))

(define-derived-mode gyp-mode python-mode "Gyp"
  "Major mode for editing .gyp files. See http://code.google.com/p/gyp/"
  ;; gyp-parse-history is a stack of (POSITION . PARSE-STATE) tuples,
  ;; with greater positions at the top of the stack. PARSE-STATE
  ;; is a list of section symbols (see gyp-section-name and gyp-parse-to)
  ;; with most nested section symbol at the front of the list.
  (set (make-local-variable 'gyp-parse-history) '((1 . (list))))
  (gyp-add-font-lock-keywords))

(defun gyp-set-indentation ()
  "Hook function to configure python indentation to suit gyp mode."
  (set (make-local-variable 'python-indent-offset) 2)
  (set (make-local-variable 'python-continuation-offset) 2)
  (set (make-local-variable 'python-indent-guess-indent-offset) t)
  (python-indent-guess-indent-offset))

(add-hook 'gyp-mode-hook 'gyp-set-indentation)

(add-to-list 'auto-mode-alist '("\\.gyp\\'" . gyp-mode))
(add-to-list 'auto-mode-alist '("\\.gypi\\'" . gyp-mode))
(add-to-list 'auto-mode-alist '("/\\.gclient\\'" . gyp-mode))

;;; Font-lock support

(defconst gyp-dependencies-regexp
  (regexp-opt (list "dependencies" "export_dependent_settings"))
  "Regular expression to introduce 'dependencies' section")

(defconst gyp-sources-regexp
  (regexp-opt (list "action" "files" "include_dirs" "includes" "inputs"
                    "libraries" "outputs" "sources"))
  "Regular expression to introduce 'sources' sections")

(defconst gyp-conditions-regexp
  (regexp-opt (list "conditions" "target_conditions"))
  "Regular expression to introduce conditions sections")

(defconst gyp-variables-regexp
  "^variables"
  "Regular expression to introduce variables sections")

(defconst gyp-defines-regexp
  "^defines"
  "Regular expression to introduce 'defines' sections")

(defconst gyp-targets-regexp
  "^targets"
  "Regular expression to introduce 'targets' sections")

(defun gyp-section-name (section)
  "Map the sections we are interested in from SECTION to symbol.

   SECTION is a string from the buffer that introduces a section.  The result is
   a symbol representing the kind of section.

   This allows us to treat (for the purposes of font-lock) several different
   section names as the same kind of section. For example, a 'sources section
   can be introduced by the 'sources', 'inputs', 'outputs' keyword.

   'other is the default section kind when a more specific match is not made."
  (cond ((string-match-p gyp-dependencies-regexp section) 'dependencies)
        ((string-match-p gyp-sources-regexp section) 'sources)
        ((string-match-p gyp-variables-regexp section) 'variables)
        ((string-match-p gyp-conditions-regexp section) 'conditions)
        ((string-match-p gyp-targets-regexp section) 'targets)
        ((string-match-p gyp-defines-regexp section) 'defines)
        (t 'other)))

(defun gyp-invalidate-parse-states-after (target-point)
  "Erase any parse information after target-point."
  (while (> (caar gyp-parse-history) target-point)
    (setq gyp-parse-history (cdr gyp-parse-history))))

(defun gyp-parse-point ()
  "The point of the last parse state added by gyp-parse-to."
  (caar gyp-parse-history))

(defun gyp-parse-sections ()
  "A list of section symbols holding at the last parse state point."
  (cdar gyp-parse-history))

(defun gyp-inside-dictionary-p ()
  "Predicate returning true if the parser is inside a dictionary."
  (not (eq (cadar gyp-parse-history) 'list)))

(defun gyp-add-parse-history (point sections)
  "Add parse state SECTIONS to the parse history at POINT so that parsing can be
   resumed instantly."
  (while (>= (caar gyp-parse-history) point)
    (setq gyp-parse-history (cdr gyp-parse-history)))
  (setq gyp-parse-history (cons (cons point sections) gyp-parse-history)))

(defun gyp-parse-to (target-point)
  "Parses from (point) to TARGET-POINT adding the parse state information to
   gyp-parse-state-history. Parsing stops if TARGET-POINT is reached or if a
   string literal has been parsed. Returns nil if no further parsing can be
   done, otherwise returns the position of the start of a parsed string, leaving
   the point at the end of the string."
  (let ((parsing t)
        string-start)
    (while parsing
      (setq string-start nil)
      ;; Parse up to a character that starts a sexp, or if the nesting
      ;; level decreases.
      (let ((state (parse-partial-sexp (gyp-parse-point)
                                       target-point
                                       -1
                                       t))
            (sections (gyp-parse-sections)))
        (if (= (nth 0 state) -1)
            (setq sections (cdr sections)) ; pop out a level
          (cond ((looking-at-p "['\"]") ; a string
                 (setq string-start (point))
                 (goto-char (scan-sexps (point) 1))
                 (if (gyp-inside-dictionary-p)
                     ;; Look for sections inside a dictionary
                     (let ((section (gyp-section-name
                                     (buffer-substring-no-properties
                                      (+ 1 string-start)
                                      (- (point) 1)))))
                       (setq sections (cons section (cdr sections)))))
                 ;; Stop after the string so it can be fontified.
                 (setq target-point (point)))
                ((looking-at-p "{")
                 ;; Inside a dictionary. Increase nesting.
                 (forward-char 1)
                 (setq sections (cons 'unknown sections)))
                ((looking-at-p "\\[")
                 ;; Inside a list. Increase nesting
                 (forward-char 1)
                 (setq sections (cons 'list sections)))
                ((not (eobp))
                 ;; other
                 (forward-char 1))))
        (gyp-add-parse-history (point) sections)
        (setq parsing (< (point) target-point))))
    string-start))

(defun gyp-section-at-point ()
  "Transform the last parse state, which is a list of nested sections and return
   the section symbol that should be used to determine font-lock information for
   the string. Can return nil indicating the string should not have any attached
   section."
  (let ((sections (gyp-parse-sections)))
    (cond
     ((eq (car sections) 'conditions)
      ;; conditions can occur in a variables section, but we still want to
      ;; highlight it as a keyword.
      nil)
     ((and (eq (car sections) 'list)
           (eq (cadr sections) 'list))
      ;; conditions and sources can have items in [[ ]]
      (caddr sections))
     (t (cadr sections)))))

(defun gyp-section-match (limit)
  "Parse from (point) to LIMIT returning by means of match data what was
   matched. The group of the match indicates what style font-lock should apply.
   See also `gyp-add-font-lock-keywords'."
  (gyp-invalidate-parse-states-after (point))
  (let ((group nil)
        (string-start t))
    (while (and (< (point) limit)
                (not group)
                string-start)
      (setq string-start (gyp-parse-to limit))
      (if string-start
          (setq group (cl-case (gyp-section-at-point)
                        ('dependencies 1)
                        ('variables 2)
                        ('conditions 2)
                        ('sources 3)
                        ('defines 4)
                        (nil nil)))))
    (if group
        (progn
          ;; Set the match data to indicate to the font-lock mechanism the
          ;; highlighting to be performed.
          (set-match-data (append (list string-start (point))
                                  (make-list (* (1- group) 2) nil)
                                  (list (1+ string-start) (1- (point)))))
          t))))

;;; Please see http://code.google.com/p/gyp/wiki/GypLanguageSpecification for
;;; canonical list of keywords.
(defun gyp-add-font-lock-keywords ()
  "Add gyp-mode keywords to font-lock mechanism."
  ;; TODO(jknotten): Move all the keyword highlighting into gyp-section-match
  ;; so that we can do the font-locking in a single font-lock pass.
  (font-lock-add-keywords
   nil
   (list
    ;; Top-level keywords
    (list (concat "['\"]\\("
              (regexp-opt (list "action" "action_name" "actions" "cflags"
                                "cflags_cc" "conditions" "configurations"
                                "copies" "defines" "dependencies" "destination"
                                "direct_dependent_settings"
                                "export_dependent_settings" "extension" "files"
                                "include_dirs" "includes" "inputs" "ldflags" "libraries"
                                "link_settings" "mac_bundle" "message"
                                "msvs_external_rule" "outputs" "product_name"
                                "process_outputs_as_sources" "rules" "rule_name"
                                "sources" "suppress_wildcard"
                                "target_conditions" "target_defaults"
                                "target_defines" "target_name" "toolsets"
                                "targets" "type" "variables" "xcode_settings"))
              "[!/+=]?\\)") 1 'font-lock-keyword-face t)
    ;; Type of target
    (list (concat "['\"]\\("
              (regexp-opt (list "loadable_module" "static_library"
                                "shared_library" "executable" "none"))
              "\\)") 1 'font-lock-type-face t)
    (list "\\(?:target\\|action\\)_name['\"]\\s-*:\\s-*['\"]\\([^ '\"]*\\)" 1
          'font-lock-function-name-face t)
    (list 'gyp-section-match
          (list 1 'font-lock-function-name-face t t) ; dependencies
          (list 2 'font-lock-variable-name-face t t) ; variables, conditions
          (list 3 'font-lock-constant-face t t) ; sources
          (list 4 'font-lock-preprocessor-face t t)) ; preprocessor
    ;; Variable expansion
    (list "<@?(\\([^\n )]+\\))" 1 'font-lock-variable-name-face t)
    ;; Command expansion
    (list "<!@?(\\([^\n )]+\\))" 1 'font-lock-variable-name-face t)
    )))

(provide 'gyp)
